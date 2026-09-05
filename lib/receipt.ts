import type {RowDataPacket} from 'mysql2/promise';
import {pool} from './mysql';
import {calculateSessionBilling} from './gaming-billing';
import {getSessionSettlement} from './session-settlement';
import {listSessionPayments} from './session-payment';

type ReceiptOrderRow=RowDataPacket & {id:string;status:string;payment_mode:string;payment_status:string;created_at:Date|string;total:number|string;item_name:string|null;qty:number|string|null;unit_price:number|string|null;participant_name:string|null};
const money=(v:unknown)=>Number(v||0);

export type SessionReceipt={
  receiptId:string;sessionId:string;stationId:string;customerName:string;sessionStatus:string;issuedAt:string;
  gaming:{total:number;participants:Array<{name:string;charge:number;memberTier?:string}>};
  food:Array<{orderId:string;status:string;paymentMode:string;paymentStatus:string;createdAt:string;total:number;items:Array<{name:string;qty:number;unitPrice:number;participantName?:string}>}>;
  totals:{gaming:number;food:number;depositApplied:number;groupAllocatedGaming:number;groupAllocatedFood:number;adjustments:number;creditApplied:number;paid:number;outstanding:number};
  payments:Array<{id:string;method:string;amount:number;status:string;createdAt:string;voidedAt?:string;voidReason?:string}>;currency:'INR';
};

export async function getSessionReceipt(sessionId:string):Promise<SessionReceipt>{
  const id=sessionId.trim();
  if(!id||id.length>64)throw Error('INVALID_SESSION_ID');
  const [sessionRows]=await pool.query<(RowDataPacket & {id:string;station_id:string;customer_name:string;status:string})[]>('SELECT id,station_id,customer_name,status FROM sessions WHERE id=? LIMIT 1',[id]);
  if(!sessionRows[0])throw Error('SESSION_NOT_FOUND');
  const session=sessionRows[0];
  const [billing,settlement]=await Promise.all([calculateSessionBilling(id),getSessionSettlement(id)]);
  const [rows]=await pool.query<ReceiptOrderRow[]>(`SELECT o.id,o.status,o.payment_mode,o.payment_status,o.created_at,o.total,oi.name AS item_name,oi.qty,oi.unit_price,sp.display_name AS participant_name FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN session_participants sp ON sp.id=oi.participant_id WHERE o.session_id=? AND o.status<>'CANCELLED' ORDER BY o.created_at ASC,o.id ASC,oi.id ASC`,[id]);
  const byOrder=new Map<string,SessionReceipt['food'][number]>();
  for(const row of rows){let order=byOrder.get(String(row.id));if(!order){order={orderId:String(row.id),status:String(row.status),paymentMode:String(row.payment_mode),paymentStatus:String(row.payment_status),createdAt:new Date(row.created_at).toISOString(),total:money(row.total),items:[]};byOrder.set(order.orderId,order)}if(row.item_name)order.items.push({name:String(row.item_name),qty:Number(row.qty)||0,unitPrice:money(row.unit_price),participantName:row.participant_name?String(row.participant_name):undefined});}
  const payments=await listSessionPayments(id);
  return {receiptId:`RCP-${id}`,sessionId:id,stationId:String(session.station_id),customerName:String(session.customer_name),sessionStatus:String(session.status),issuedAt:new Date().toISOString(),gaming:{total:billing.gamingTotal,participants:billing.participants.map(p=>({name:p.displayName,charge:p.charge,memberTier:p.memberTier}))},food:Array.from(byOrder.values()),totals:{gaming:billing.gamingTotal,food:settlement.foodTotal,depositApplied:settlement.depositApplied,groupAllocatedGaming:settlement.groupAllocatedGaming,groupAllocatedFood:settlement.groupAllocatedFood,adjustments:settlement.adjustments,creditApplied:settlement.creditApplied,paid:settlement.paid,outstanding:settlement.outstanding},payments:payments.map(p=>({id:p.id,method:p.method,amount:p.amount,status:p.status,createdAt:p.createdAt,voidedAt:p.voidedAt,voidReason:p.voidReason})),currency:'INR'};
}
