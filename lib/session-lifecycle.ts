import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {transaction} from './mysql';
import {calculateSessionBilling} from './gaming-billing';

export async function endSessionForSettlement(sessionId:string){return transaction(async(c:PoolConnection)=>{
 const [rows]=await c.query<RowDataPacket[]>('SELECT id,station_id,status FROM sessions WHERE id=? FOR UPDATE',[sessionId]);
 if(!rows[0])throw Error('SESSION_NOT_FOUND');
 if(String(rows[0].status)==='ENDED')return getEndedSettlement(c,sessionId,String(rows[0].station_id));
 if(!['ACTIVE','PAUSED'].includes(String(rows[0].status)))throw Error('INVALID_SESSION_STATE');
 await c.execute("UPDATE sessions SET status='ENDED',ended_at=NOW(3),paused_at=NULL WHERE id=?",[sessionId]);
 const billing=await calculateSessionBilling(sessionId,c);
 await c.execute('UPDATE sessions SET gaming_balance=? WHERE id=?',[billing.gamingTotal,sessionId]);
 const result=await getEndedSettlement(c,sessionId,String(rows[0].station_id));
 if(result.outstanding<=0)await c.execute("UPDATE stations SET status='AVAILABLE' WHERE id=? AND status='ACTIVE'",[rows[0].station_id]);
 return result;
});}

async function getEndedSettlement(c:PoolConnection,sessionId:string,stationId:string){
 const billing=await calculateSessionBilling(sessionId,c);
 const [food]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(oi.qty*oi.unit_price),0) total FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.session_id=? AND o.payment_status IN ('UNPAID','FAILED') AND o.status<>'CANCELLED'",[sessionId]);
 const [ga]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM group_settlement_allocations WHERE source_type='GAMING_SESSION' AND source_id=?",[sessionId]);
 const [fa]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM group_settlement_allocations WHERE session_id=? AND source_type='FOOD_ORDER_ITEM'",[sessionId]);
 const [deposit]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM booking_deposit_applications WHERE session_id=?",[sessionId]);
 const [paid]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM session_settlements WHERE session_id=? AND status='CAPTURED'",[sessionId]);
 const [credit]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM customer_credit_entries WHERE source_type='SESSION' AND source_id=?",[sessionId]);
 const [adjustments]=await c.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount),0) total FROM billing_adjustments WHERE session_id=?",[sessionId]);
 const gross=Math.max(0,Math.max(0,billing.gamingTotal-Number(ga[0]?.total||0))+Math.max(0,Number(food[0]?.total||0)-Number(fa[0]?.total||0))-Number(deposit[0]?.total||0)+Number(adjustments[0]?.total||0)-Number(credit[0]?.total||0));
 const captured=Number(paid[0]?.total||0),outstanding=Math.max(0,gross-captured);
 const settlementStatus=outstanding===0?'SETTLED':captured>0?'PARTIALLY_PAID':'DUE';
 await c.execute('UPDATE sessions SET settlement_status=? WHERE id=?',[settlementStatus,sessionId]);
 return {sessionId,stationId,outstanding,settlementStatus,gamingTotal:billing.gamingTotal,foodTotal:Number(food[0]?.total||0),depositApplied:Number(deposit[0]?.total||0),paid:captured,creditApplied:Number(credit[0]?.total||0),adjustments:Number(adjustments[0]?.total||0)};
}
