import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {pool,transaction} from './mysql';
import {calculateSessionBilling} from './gaming-billing';

export type SessionSettlementMethod='CASH'|'UPI'|'CARD'|'RAZORPAY'|'OTHER';
const id=(p:string)=>`${p}-${randomUUID()}`;

export async function getSessionSettlement(sessionId:string){
 return transaction(async(c:PoolConnection)=>{
  const [s]=await c.query<RowDataPacket[]>('SELECT id,status FROM sessions WHERE id=? LIMIT 1',[sessionId]);
  if(!s[0])throw Error('SESSION_NOT_FOUND');
  const billing=await calculateSessionBilling(sessionId,c);
  const [food]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(oi.qty*oi.unit_price),0) total FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.session_id=? AND o.payment_status IN ('UNPAID','FAILED') AND o.status<>'CANCELLED'",[sessionId]);
  const [groupAlloc]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM group_settlement_allocations WHERE source_type='GAMING_SESSION' AND source_id=?",[sessionId]);
  const [foodAlloc]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM group_settlement_allocations WHERE session_id=? AND source_type='FOOD_ORDER_ITEM'",[sessionId]);
  const [deposit]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(a.amount),0) total FROM booking_deposit_applications a WHERE a.session_id=?",[sessionId]);
  const [paid]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM session_settlements WHERE session_id=? AND status='CAPTURED'",[sessionId]);
  const gamingOutstanding=Math.max(0,billing.gamingTotal-Number(groupAlloc[0]?.total||0)-Number(deposit[0]?.total||0));
  const foodOutstanding=Math.max(0,Number(food[0]?.total||0)-Number(foodAlloc[0]?.total||0));
  const gross=Math.max(0,gamingOutstanding+foodOutstanding);
  const settled=Math.min(gross,Number(paid[0]?.total||0));
  return {sessionId,status:String(s[0].status),gamingTotal:billing.gamingTotal,foodTotal:Number(food[0]?.total||0),depositApplied:Number(deposit[0]?.total||0),groupAllocatedGaming:Number(groupAlloc[0]?.total||0),groupAllocatedFood:Number(foodAlloc[0]?.total||0),paid:Number(paid[0]?.total||0),outstanding:Math.max(0,gross-settled),currency:'INR'};
 });
}

export async function settleSession(input:{sessionId:string;amount:number;method:SessionSettlementMethod;staffId:string;idempotencyKey?:string}){
 return transaction(async(c:PoolConnection)=>{
  const sessionId=input.sessionId.trim(),amount=Number(input.amount),key=input.idempotencyKey?.trim()||null;
  if(!sessionId||!Number.isSafeInteger(amount)||amount<=0)throw Error('INVALID_SETTLEMENT');
  if(!['CASH','UPI','CARD','RAZORPAY','OTHER'].includes(input.method))throw Error('INVALID_PAYMENT_METHOD');
  if(key&&key.length>100)throw Error('INVALID_IDEMPOTENCY_KEY');
  const [s]=await c.query<RowDataPacket[]>('SELECT id,status FROM sessions WHERE id=? FOR UPDATE',[sessionId]);
  if(!s[0])throw Error('SESSION_NOT_FOUND');
  if(String(s[0].status)!=='ENDED')throw Error('SESSION_MUST_BE_ENDED');
  if(key){const [old]=await c.query<RowDataPacket[]>('SELECT id,amount,method,status FROM session_settlements WHERE session_id=? AND idempotency_key=? LIMIT 1',[sessionId,key]);if(old[0])return {settlementId:String(old[0].id),amount:Number(old[0].amount),method:String(old[0].method),existing:true};}
  const [groups]=await c.query<RowDataPacket[]>("SELECT g.id FROM session_groups g JOIN session_group_members gm ON gm.group_id=g.id WHERE gm.session_id=? AND g.status='OPEN' LIMIT 1",[sessionId]);
  if(groups[0])throw Error('SESSION_BELONGS_TO_OPEN_GROUP');
  const summary=await getSessionSettlementOn(c,sessionId);
  if(amount>summary.outstanding)throw Error('SETTLEMENT_EXCEEDS_OUTSTANDING');
  const settlementId=id('SET');
  await c.execute('INSERT INTO session_settlements(id,session_id,method,amount,status,idempotency_key,created_by,created_at) VALUES(?,?,?,?,\'CAPTURED\',?,?,NOW(3))',[settlementId,sessionId,input.method,amount,key,input.staffId]);
  await c.execute('INSERT INTO finance_transactions(id,type,category,description,amount,method,source_type,source_id,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,NOW(3))',[id('FIN'),'REVENUE','GAMING','Gaming session '+sessionId,amount,input.method,'SESSION_SETTLEMENT',settlementId,input.staffId]);
  return {settlementId,sessionId,amount,method:input.method,existing:false,outstandingAfter:summary.outstanding-amount};
 });
}

async function getSessionSettlementOn(c:PoolConnection,sessionId:string){
 const billing=await calculateSessionBilling(sessionId,c);
 const [food]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(oi.qty*oi.unit_price),0) total FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.session_id=? AND o.payment_status IN ('UNPAID','FAILED') AND o.status<>'CANCELLED'",[sessionId]);
 const [ga]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM group_settlement_allocations WHERE source_type='GAMING_SESSION' AND source_id=?",[sessionId]);
 const [fa]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM group_settlement_allocations WHERE session_id=? AND source_type='FOOD_ORDER_ITEM'",[sessionId]);
 const [da]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM booking_deposit_applications WHERE session_id=?",[sessionId]);
 const [sp]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM session_settlements WHERE session_id=? AND status='CAPTURED'",[sessionId]);
 const gross=Math.max(0,billing.gamingTotal-Number(ga[0]?.total||0)-Number(da[0]?.total||0))+Math.max(0,Number(food[0]?.total||0)-Number(fa[0]?.total||0));
 const paid=Number(sp[0]?.total||0);
 return {outstanding:Math.max(0,gross-paid)};
}
