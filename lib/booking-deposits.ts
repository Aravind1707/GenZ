import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {pool,transaction} from './mysql';

export type BookingDepositMethod='CASH'|'UPI'|'CARD'|'OTHER';

export async function recordBookingDeposit(input:{bookingId:string;amount:number;method:BookingDepositMethod;staffId:string}){
  return transaction(async(c:PoolConnection)=>{
    const bookingId=input.bookingId.trim();const amount=Number(input.amount);
    if(!bookingId||!Number.isSafeInteger(amount)||amount<=0)throw Error('INVALID_DEPOSIT_PAYMENT');
    if(!['CASH','UPI','CARD','OTHER'].includes(input.method))throw Error('INVALID_PAYMENT_METHOD');
    const [booking]=await c.query<RowDataPacket[]>('SELECT id,deposit,status FROM bookings WHERE id=? FOR UPDATE',[bookingId]);
    if(!booking[0])throw Error('BOOKING_NOT_FOUND');if(['CANCELLED','NO_SHOW'].includes(String(booking[0].status)))throw Error('BOOKING_NOT_ACTIVE');
    const [paid]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) AS total FROM booking_deposit_payments WHERE booking_id=? AND status='CAPTURED'",[bookingId]);
    const paidAmount=Number(paid[0]?.total||0);const required=Number(booking[0].deposit||0);const outstanding=Math.max(0,required-paidAmount);
    if(!required)throw Error('NO_DEPOSIT_REQUIRED');if(amount>outstanding)throw Error('DEPOSIT_PAYMENT_EXCEEDS_OUTSTANDING');
    const paymentId=`BDP-${randomUUID()}`;
    await c.execute('INSERT INTO booking_deposit_payments(id,booking_id,amount,method,status,created_by,created_at) VALUES(?,?,?,? ,\'CAPTURED\',?,NOW(3))',[paymentId,bookingId,amount,input.method,input.staffId]);
    await c.execute('INSERT INTO finance_transactions(id,type,category,description,amount,method,source_type,source_id,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,NOW(3))',[`FIN-${randomUUID()}`,'REVENUE','BOOKING_DEPOSIT',`Booking deposit · ${bookingId}`,amount,input.method,'BOOKING_DEPOSIT_PAYMENT',paymentId,input.staffId]);
    return {paymentId,bookingId,amount,method:input.method,required,paidAmount:paidAmount+amount,outstanding:Math.max(0,outstanding-amount)};
  });
}

export async function listBookingDepositPayments(bookingId:string){
  const [rows]=await pool.query<RowDataPacket[]>('SELECT id,amount,method,status,created_at FROM booking_deposit_payments WHERE booking_id=? ORDER BY created_at DESC LIMIT 100',[bookingId.trim()]);
  return rows.map(r=>({id:String(r.id),amount:Number(r.amount),method:String(r.method),status:String(r.status),createdAt:new Date(r.created_at).toISOString()}));
}

export async function bookingDepositSummary(bookingId:string){
  const [rows]=await pool.query<RowDataPacket[]>("SELECT b.deposit,COALESCE(SUM(CASE WHEN p.status='CAPTURED' THEN p.amount ELSE 0 END),0) AS paid,COALESCE((SELECT SUM(a.amount) FROM booking_deposit_applications a WHERE a.booking_id=b.id),0) AS applied,COALESCE((SELECT SUM(r.amount) FROM booking_deposit_refunds r WHERE r.booking_id=b.id AND r.status='CAPTURED'),0) AS refunded FROM bookings b LEFT JOIN booking_deposit_payments p ON p.booking_id=b.id WHERE b.id=? GROUP BY b.id,b.deposit",[bookingId.trim()]);
  if(!rows[0])throw Error('BOOKING_NOT_FOUND');
  const required=Number(rows[0].deposit||0),paid=Number(rows[0].paid||0),applied=Number(rows[0].applied||0),refunded=Number(rows[0].refunded||0);
  return {required,paid,applied,refunded,outstanding:Math.max(0,required-paid),refundable:Math.max(0,paid-applied-refunded)};
}

export async function refundBookingDeposit(input:{bookingId:string;amount:number;method:BookingDepositMethod;staffId:string}){
 return transaction(async(c:PoolConnection)=>{
  const bookingId=input.bookingId.trim();const amount=Number(input.amount);if(!bookingId||!Number.isSafeInteger(amount)||amount<=0)throw Error('INVALID_DEPOSIT_REFUND');if(!['CASH','UPI','CARD','OTHER'].includes(input.method))throw Error('INVALID_PAYMENT_METHOD');
  const[b]=await c.query<RowDataPacket[]>('SELECT id,deposit,status,session_id FROM bookings WHERE id=? FOR UPDATE',[bookingId]);if(!b[0])throw Error('BOOKING_NOT_FOUND');
  if(!b[0].session_id)throw Error('DEPOSIT_REFUND_REQUIRES_SESSION');
  const[s]=await c.query<RowDataPacket[]>('SELECT status FROM sessions WHERE id=? LIMIT 1',[b[0].session_id]);if(!s[0]||s[0].status!=='ENDED')throw Error('SESSION_MUST_BE_ENDED_BEFORE_REFUND');
  const[p]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM booking_deposit_payments WHERE booking_id=? AND status='CAPTURED'",[bookingId]);
  const[a]=await c.query<RowDataPacket[]>('SELECT COALESCE(SUM(amount),0) total FROM booking_deposit_applications WHERE booking_id=?',[bookingId]);
  const[r]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM booking_deposit_refunds WHERE booking_id=? AND status='CAPTURED'",[bookingId]);
  const refundable=Math.max(0,Number(p[0]?.total||0)-Number(a[0]?.total||0)-Number(r[0]?.total||0));if(amount>refundable)throw Error('DEPOSIT_REFUND_EXCEEDS_OUTSTANDING');
  const[payments]=await c.query<RowDataPacket[]>("SELECT p.id,p.amount,COALESCE((SELECT SUM(a.amount) FROM booking_deposit_applications a WHERE a.payment_id=p.id),0) applied,COALESCE((SELECT SUM(r.amount) FROM booking_deposit_refunds r WHERE r.payment_id=p.id AND r.status='CAPTURED'),0) refunded FROM booking_deposit_payments p WHERE p.booking_id=? AND p.status='CAPTURED' ORDER BY p.created_at,p.id FOR UPDATE",[bookingId]);
  let remaining=amount;for(const payment of payments){if(remaining<=0)break;const available=Math.max(0,Number(payment.amount)-Number(payment.applied||0)-Number(payment.refunded||0));const take=Math.min(available,remaining);if(take<=0)continue;const refundId=`BDR-${randomUUID()}`;await c.execute('INSERT INTO booking_deposit_refunds(id,booking_id,payment_id,amount,method,status,created_by,created_at) VALUES(?,?,?,?,\'CAPTURED\',?,?,NOW(3))',[refundId,bookingId,payment.id,take,input.method,input.staffId]);await c.execute('INSERT INTO finance_transactions(id,type,category,description,amount,method,source_type,source_id,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,NOW(3))',[`FIN-${randomUUID()}`,'EXPENSE','BOOKING_DEPOSIT_REFUND',`Booking deposit refund · ${bookingId}`,take,input.method,'BOOKING_DEPOSIT_REFUND',refundId,input.staffId]);remaining-=take;}
  return {bookingId,refunded:amount,refundable:refundable-amount};
 });
}
