import {randomUUID} from 'node:crypto';
import type {RowDataPacket } from 'mysql2/promise';
import {transaction} from './mysql';

export type MembershipPaymentMethod='CASH'|'UPI'|'CARD'|'RAZORPAY'|'OTHER';
const id=(p:string)=>`${p}-${randomUUID()}`;
const money=(n:number)=>Math.max(0,Math.round(n));
const dateOnly=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'';

export async function renewMembership(input:{memberId:string;newExpiresAt:string;amount:number;method:MembershipPaymentMethod;staffId:string}){
 return transaction(async c=>{
  const memberId=input.memberId.trim();
  const expiresAt=dateOnly(input.newExpiresAt);
  const amount=money(Number(input.amount));
  if(!memberId||!expiresAt||!amount)throw Error('INVALID_RENEWAL');
  if(!['CASH','UPI','CARD','RAZORPAY','OTHER'].includes(input.method))throw Error('INVALID_PAYMENT_METHOD');
  const [rows]=await c.query<RowDataPacket[]>('SELECT id,expires_at,active FROM members WHERE id=? FOR UPDATE',[memberId]);
  if(!rows[0])throw Error('MEMBER_NOT_FOUND');
  const previous=String(rows[0].expires_at).slice(0,10);
  if(expiresAt<=previous)throw Error('NEW_EXPIRY_MUST_BE_AFTER_CURRENT');
  const txId=id('MTX');
  await c.execute('UPDATE members SET expires_at=?,active=TRUE,updated_at=NOW(3) WHERE id=?',[expiresAt,memberId]);
  await c.execute('INSERT INTO membership_transactions(id,member_id,type,amount,method,status,previous_expires_at,new_expires_at,created_by,created_at) VALUES(?,?,?,?,\'CAPTURED\',?,?,?,?,NOW(3))',[txId,memberId,'RENEWAL',amount,input.method,previous,expiresAt,input.staffId]);
  await c.execute('INSERT INTO finance_transactions(id,type,category,description,amount,method,source_type,source_id,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,NOW(3))',[id('FIN'),'REVENUE','MEMBERSHIP',`Membership renewal · ${memberId}`,amount,input.method,'MEMBERSHIP_TRANSACTION',txId,input.staffId]);
  return{transactionId:txId,memberId,amount,method:input.method,previousExpiresAt:previous,newExpiresAt:expiresAt};
 });
}

export async function listMembershipTransactions(memberId:string){
 const [rows]=await (await import('./mysql')).pool.query<RowDataPacket[]>('SELECT id,type,amount,method,status,previous_expires_at,new_expires_at,created_at FROM membership_transactions WHERE member_id=? ORDER BY created_at DESC LIMIT 100',[memberId.trim()]);
 return rows.map(r=>({id:String(r.id),type:String(r.type),amount:Number(r.amount),method:String(r.method),status:String(r.status),previousExpiresAt:r.previous_expires_at?String(r.previous_expires_at).slice(0,10):null,newExpiresAt:String(r.new_expires_at).slice(0,10),createdAt:new Date(r.created_at).toISOString()}));
}
