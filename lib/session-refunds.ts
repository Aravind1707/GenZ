import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {transaction} from './mysql';
import {calculateRefund} from './refund-policy';
import {assertDailyCloseOpen} from './daily-close-lock';

export type SessionRefundMethod='CASH'|'UPI'|'CARD'|'RAZORPAY'|'OTHER';
const id=()=>`REF-${randomUUID()}`;
const money=(v:unknown)=>Number(v||0);

export async function refundSessionPayment(input:{settlementId:string;amount:number;method:SessionRefundMethod;staffId:string;reason:string;reference?:string;provider?:string;externalReference?:string;idempotencyKey?:string}){
  return transaction(async(c:PoolConnection)=>{
    await assertDailyCloseOpen(c);
    const settlementId=input.settlementId.trim();
    const amount=Number(input.amount);
    const reason=input.reason.trim().slice(0,255);
    const key=input.idempotencyKey?.trim()||null;
    const provider=input.provider?.trim().slice(0,80)||null;
    const externalReference=input.externalReference?.trim().slice(0,160)||input.reference?.trim().slice(0,120)||null;
    if(!settlementId||!Number.isSafeInteger(amount)||amount<=0)throw Error('INVALID_REFUND');
    if(!['CASH','UPI','CARD','RAZORPAY','OTHER'].includes(input.method))throw Error('INVALID_REFUND_METHOD');
    if(!reason)throw Error('REFUND_REASON_REQUIRED');
    if(key&&key.length>128)throw Error('INVALID_IDEMPOTENCY_KEY');

    const[settlements]=await c.query<RowDataPacket[]>('SELECT id,session_id,amount,method,status FROM session_settlements WHERE id=? FOR UPDATE',[settlementId]);
    if(!settlements[0])throw Error('SETTLEMENT_NOT_FOUND');
    if(String(settlements[0].status)!=='CAPTURED')throw Error('SETTLEMENT_NOT_CAPTURED');
    const sessionId=String(settlements[0].session_id);
    const[sessions]=await c.query<RowDataPacket[]>('SELECT id,station_id,status,settlement_status FROM sessions WHERE id=? FOR UPDATE',[sessionId]);
    if(!sessions[0])throw Error('SESSION_NOT_FOUND');
    if(String(sessions[0].status)!=='ENDED')throw Error('SESSION_MUST_BE_ENDED');
    if(String(sessions[0].settlement_status)==='CREDIT')throw Error('CREDIT_SESSION_REFUND_REQUIRES_CREDIT_ADJUSTMENT');

    if(key){
      const[existing]=await c.query<RowDataPacket[]>('SELECT id,amount,method FROM session_payment_refunds WHERE settlement_id=? AND idempotency_key=? LIMIT 1',[settlementId,key]);
      if(existing[0]){
        if(money(existing[0].amount)!==amount||String(existing[0].method)!==input.method)throw Error('IDEMPOTENCY_CONFLICT');
        const[summary]=await settlementSummary(c,sessionId);
        return{refundId:String(existing[0].id),settlementId,sessionId,amount,method:input.method,outstandingAfter:summary.outstanding,existing:true};
      }
    }

    const[refundedRows]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM session_payment_refunds WHERE settlement_id=? AND status='CAPTURED'",[settlementId]);
    const decision=calculateRefund({capturedAmount:BigInt(money(settlements[0].amount)),alreadyRefunded:BigInt(money(refundedRows[0]?.total)),requestedAmount:BigInt(amount),allowPartial:true});
    if(!decision.refundable)throw Error(decision.reason);

    const refundId=id();
    await c.execute('INSERT INTO session_payment_refunds(id,settlement_id,session_id,amount,method,provider,external_reference,provider_status,status,reference,idempotency_key,reason,created_by,created_at) VALUES(?,?,?,?,?,?,?,\'NOT_SENT\',?,?,?,?,?,NOW(3))',[refundId,settlementId,sessionId,amount,input.method,provider,externalReference,'CAPTURED',input.reference?.trim().slice(0,120)||null,key,reason,input.staffId]);
    await c.execute('INSERT INTO finance_transactions(id,type,category,description,amount,method,source_type,source_id,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,NOW(3))',[`FIN-${randomUUID()}`,'EXPENSE','PAYMENT_REFUND','Session payment refund '+settlementId,amount,input.method,'SESSION_PAYMENT_REFUND',refundId,input.staffId]);

    const[summary]=await settlementSummary(c,sessionId);
    const status=summary.outstanding===0?'SETTLED':summary.paid>0?'PARTIALLY_PAID':'DUE';
    await c.execute('UPDATE sessions SET settlement_status=? WHERE id=?',[status,sessionId]);
    if(summary.outstanding>0)await c.execute("UPDATE stations SET status='BLOCKED' WHERE id=? AND status='AVAILABLE'",[sessions[0].station_id]);
    return{refundId,settlementId,sessionId,amount,method:input.method,outstandingAfter:summary.outstanding,existing:false};
  });
}

async function settlementSummary(c:PoolConnection,sessionId:string){
  const{calculateSessionBilling}=await import('./gaming-billing');
  const[s]=await c.query<RowDataPacket[]>('SELECT id,status,settlement_status FROM sessions WHERE id=? LIMIT 1',[sessionId]);
  if(!s[0])throw Error('SESSION_NOT_FOUND');
  const billing=await calculateSessionBilling(sessionId,c);
  const[food]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(oi.qty*oi.unit_price),0) total FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.session_id=? AND o.payment_status IN ('UNPAID','FAILED') AND o.status<>'CANCELLED'",[sessionId]);
  const[ga]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM group_settlement_allocations WHERE source_type='GAMING_SESSION' AND source_id=?",[sessionId]);
  const[fa]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM group_settlement_allocations WHERE session_id=? AND source_type='FOOD_ORDER_ITEM'",[sessionId]);
  const[da]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM booking_deposit_applications WHERE session_id=?",[sessionId]);
  const[sp]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM session_settlements WHERE session_id=? AND status='CAPTURED'",[sessionId]);
  const[sr]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM session_payment_refunds WHERE session_id=? AND status='CAPTURED'",[sessionId]);
  const[cr]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM customer_credit_entries WHERE source_type='SESSION' AND source_id=?",[sessionId]);
  const[adj]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM billing_adjustments WHERE session_id=?",[sessionId]);
  const grossBeforePayments=Math.max(0,Math.max(0,billing.gamingTotal-money(ga[0]?.total))+Math.max(0,money(food[0]?.total)-money(fa[0]?.total))-money(da[0]?.total)+money(adj[0]?.total));
  const creditApplied=money(cr[0]?.total),captured=money(sp[0]?.total),refunded=money(sr[0]?.total);
  const paid=Math.max(0,captured-refunded),gross=Math.max(0,grossBeforePayments-creditApplied);
  return[{sessionId,status:String(s[0].status),gamingTotal:billing.gamingTotal,foodTotal:money(food[0]?.total),depositApplied:money(da[0]?.total),groupAllocatedGaming:money(ga[0]?.total),groupAllocatedFood:money(fa[0]?.total),adjustments:money(adj[0]?.total),creditApplied,paid,refunded,outstanding:Math.max(0,gross-paid),currency:'INR',settlementStatus:String(s[0].settlement_status||'NOT_DUE')}];
}

export async function listSessionRefunds(sessionId:string){
  return transaction(async(c)=>{
    const id=sessionId.trim();
    if(!id||id.length>64)throw Error('INVALID_SESSION_ID');
    const[rows]=await c.query<RowDataPacket[]>('SELECT id,settlement_id,session_id,amount,method,status,provider,external_reference,provider_status,reference,reason,created_by,created_at FROM session_payment_refunds WHERE session_id=? ORDER BY created_at DESC,id DESC',[id]);
    return rows.map(r=>({id:String(r.id),settlementId:String(r.settlement_id),sessionId:String(r.session_id),amount:money(r.amount),method:String(r.method),status:String(r.status),provider:r.provider?String(r.provider):undefined,externalReference:r.external_reference?String(r.external_reference):undefined,providerStatus:String(r.provider_status||'NOT_SENT'),reference:r.reference?String(r.reference):undefined,reason:String(r.reason),createdBy:r.created_by?String(r.created_by):undefined,createdAt:new Date(r.created_at).toISOString()}));
  });
}
