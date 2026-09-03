import { createHash, randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool, transaction } from './mysql';

export type StationType = 'PC' | 'PS5' | 'MOZA';
export type StationStatus = 'AVAILABLE' | 'BOOKED' | 'ACTIVE' | 'MAINTENANCE' | 'BLOCKED';
export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';
export type OrderStatus = 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type PaymentMode = 'PAY_NOW' | 'ADD_TO_BILL' | 'WALLET';

export type Station = { id:string; name:string; type:StationType; status:StationStatus; hourlyRate:number; slotMinutes:number; };
export type Session = { id:string; stationId:string; customerName:string; memberId?:string; status:SessionStatus; startedAt:string; pausedAt?:string; endedAt?:string; token?:string; balance:number; };
export type OrderItem = { itemId:string; name:string; qty:number; unitPrice:number; };
export type Order = { id:string; sessionId:string; stationId:string; items:OrderItem[]; status:OrderStatus; paymentMode:PaymentMode; createdAt:string; total:number; };

type StationRow = RowDataPacket & {id:string;name:string;type:StationType;status:StationStatus;hourly_rate:number;slot_minutes:number};
type SessionRow = RowDataPacket & {id:string;station_id:string;customer_name:string;member_id:string|null;status:SessionStatus;started_at:string;paused_at:string|null;ended_at:string|null;token_hash:string;gaming_balance:number;food_balance:number};
type OrderRow = RowDataPacket & {id:string;session_id:string;station_id:string;status:OrderStatus;payment_mode:PaymentMode;created_at:string;total:number};
type ItemRow = RowDataPacket & {order_id:string;item_id:string;name:string;qty:number;unit_price:number};

const now = () => new Date();
const makeId = (prefix:string) => `${prefix}-${randomUUID()}`;
const hashToken = (token:string) => createHash('sha256').update(token).digest('hex');

const mapStation = (r:StationRow):Station => ({id:r.id,name:r.name,type:r.type,status:r.status,hourlyRate:Number(r.hourly_rate),slotMinutes:Number(r.slot_minutes)});
const mapSession = (r:SessionRow, token?:string):Session => ({id:r.id,stationId:r.station_id,customerName:r.customer_name,memberId:r.member_id||undefined,status:r.status,startedAt:new Date(r.started_at).toISOString(),pausedAt:r.paused_at?new Date(r.paused_at).toISOString():undefined,endedAt:r.ended_at?new Date(r.ended_at).toISOString():undefined,token,balance:Number(r.gaming_balance)+Number(r.food_balance)});

export async function listStations():Promise<Station[]> { const [rows] = await pool.query<StationRow[]>('SELECT * FROM stations ORDER BY type,name'); return rows.map(mapStation); }
export async function listSessions():Promise<Session[]> { const [rows] = await pool.query<SessionRow[]>('SELECT * FROM sessions ORDER BY started_at DESC'); return rows.map(r=>mapSession(r)); }

export async function listOrders():Promise<Order[]> {
  const [rows] = await pool.query<OrderRow[]>('SELECT * FROM orders ORDER BY created_at DESC');
  if (!rows.length) return [];
  const ids=rows.map(r=>r.id); const placeholders=ids.map(()=>'?').join(',');
  const [items]=await pool.query<ItemRow[]>(`SELECT order_id,item_id,name,qty,unit_price FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`,ids);
  const byOrder=new Map<string,OrderItem[]>();
  for(const item of items) byOrder.set(item.order_id,[...(byOrder.get(item.order_id)||[]),{itemId:item.item_id,name:item.name,qty:Number(item.qty),unitPrice:Number(item.unit_price)}]);
  return rows.map(r=>({id:r.id,sessionId:r.session_id,stationId:r.station_id,items:byOrder.get(r.id)||[],status:r.status,paymentMode:r.payment_mode,createdAt:new Date(r.created_at).toISOString(),total:Number(r.total)}));
}

const mapOrder = (row:OrderRow, items:ItemRow[]):Order => ({
  id:row.id,
  sessionId:row.session_id,
  stationId:row.station_id,
  items:items.filter(i=>i.order_id===row.id).map(i=>({itemId:i.item_id,name:i.name,qty:Number(i.qty),unitPrice:Number(i.unit_price)})),
  status:row.status,
  paymentMode:row.payment_mode,
  createdAt:new Date(row.created_at).toISOString(),
  total:Number(row.total),
});

export async function startSession(input:{stationId:string;customerName:string;memberId?:string}) {
  const customerName=input.customerName.trim().slice(0,120)||'Walk-in';
  const memberId=input.memberId?.trim().slice(0,64)||undefined;
  return transaction(async (connection:PoolConnection)=>{
    const [rows]=await connection.query<StationRow[]>('SELECT * FROM stations WHERE id=? FOR UPDATE',[input.stationId]);
    const station=rows[0]; if(!station) throw new Error('Station not found');
    if(station.status!=='AVAILABLE') throw new Error('Station is not available');
    const [active]=await connection.query<RowDataPacket[]>('SELECT id FROM sessions WHERE station_id=? AND status IN (\'ACTIVE\',\'PAUSED\') LIMIT 1',[station.id]);
    if(active.length) throw new Error('Station already has an active session');
    const token=randomUUID(); const session:Session={id:makeId('SES'),stationId:station.id,customerName,memberId,status:'ACTIVE',startedAt:new Date().toISOString(),token,balance:0};
    await connection.execute('INSERT INTO sessions(id,station_id,customer_name,member_id,status,started_at,token_hash,gaming_balance,food_balance) VALUES (?,?,?,?,?,?,?,?,?)',[session.id,session.stationId,session.customerName,session.memberId||null,session.status,session.startedAt,hashToken(token),0,0]);
    await connection.execute('UPDATE stations SET status=\'ACTIVE\' WHERE id=?',[station.id]);
    return session;
  });
}

export async function endSession(sessionId:string) {
  return transaction(async(connection:PoolConnection)=>{
    const [rows]=await connection.query<SessionRow[]>('SELECT * FROM sessions WHERE id=? FOR UPDATE',[sessionId]);
    const row=rows[0]; if(!row) throw new Error('Session not found');
    if(row.status!=='ENDED') { await connection.execute('UPDATE sessions SET status=\'ENDED\',ended_at=? WHERE id=?',[now(),sessionId]); await connection.execute('UPDATE stations SET status=\'AVAILABLE\' WHERE id=? AND status=\'ACTIVE\'',[row.station_id]); }
    const [fresh]=await connection.query<SessionRow[]>('SELECT * FROM sessions WHERE id=?',[sessionId]); return mapSession(fresh[0]);
  });
}

export async function authorizeSession(sessionId:string,token:string) {
  const [rows]=await pool.query<SessionRow[]>('SELECT * FROM sessions WHERE id=? AND token_hash=? AND status IN (\'ACTIVE\',\'PAUSED\') LIMIT 1',[sessionId,hashToken(token)]);
  return rows[0]?mapSession(rows[0]):null;
}

export async function createOrder(input:{sessionId:string;items:OrderItem[];paymentMode:PaymentMode}) {
  if(!['PAY_NOW','ADD_TO_BILL','WALLET'].includes(input.paymentMode)) throw new Error('Invalid payment mode');
  if(!Array.isArray(input.items)||input.items.length<1||input.items.length>50) throw new Error('Invalid order items');
  return transaction(async(connection:PoolConnection)=>{
    const [sessions]=await connection.query<SessionRow[]>('SELECT * FROM sessions WHERE id=? AND status IN (\'ACTIVE\',\'PAUSED\') FOR UPDATE',[input.sessionId]);
    const session=sessions[0]; if(!session) throw new Error('Active session required');
    const ids=[...new Set(input.items.map(i=>String(i.itemId||'').trim()))]; if(ids.some(x=>!x)||ids.length!==input.items.length) throw new Error('Invalid menu item');
    const placeholders=ids.map(()=>'?').join(',');
    const [menu]=await connection.query<(RowDataPacket & {id:string;name:string;member_price:number;non_member_price:number;active:number})[]>(`SELECT id,name,member_price,non_member_price,active FROM menu_items WHERE id IN (${placeholders}) FOR UPDATE`,ids);
    if(menu.length!==ids.length||menu.some(m=>!m.active)) throw new Error('Menu item unavailable');
    const menuById=new Map(menu.map(m=>[m.id,m])); const member=Boolean(session.member_id);
    const items=input.items.map(i=>{const m=menuById.get(String(i.itemId)); const qty=Number(i.qty); if(!m||!Number.isInteger(qty)||qty<1||qty>99) throw new Error('Invalid order item'); const price=Number(member?m.member_price:m.non_member_price); return {itemId:m.id,name:m.name,qty,unitPrice:price};});
    const total=items.reduce((s,i)=>s+i.qty*i.unitPrice,0); const order:Order={id:makeId('ORD'),sessionId:session.id,stationId:session.station_id,items,status:'NEW',paymentMode:input.paymentMode,createdAt:new Date().toISOString(),total};
    await connection.execute('INSERT INTO orders(id,session_id,station_id,status,payment_mode,created_at,total) VALUES (?,?,?,?,?,?,?)',[order.id,order.sessionId,order.stationId,order.status,order.paymentMode,order.createdAt,total]);
    for(const item of items) await connection.execute('INSERT INTO order_items(order_id,item_id,name,qty,unit_price) VALUES (?,?,?,?,?)',[order.id,item.itemId,item.name,item.qty,item.unitPrice]);
    if(input.paymentMode==='ADD_TO_BILL') await connection.execute('UPDATE sessions SET food_balance=food_balance+? WHERE id=?',[total,session.id]);
    return order;
  });
}

export async function advanceOrder(orderId:string) {
  return transaction(async(connection:PoolConnection)=>{
    const [rows]=await connection.query<OrderRow[]>('SELECT * FROM orders WHERE id=? FOR UPDATE',[orderId]);
    const order=rows[0]; if(!order) throw new Error('Order not found');
    const flow:OrderStatus[]=['NEW','ACCEPTED','PREPARING','READY','DELIVERED'];
    const index=flow.indexOf(order.status); if(index<0||index>=flow.length-1) throw new Error('Invalid order transition');
    const next=flow[index+1];
    const [result]=await connection.execute('UPDATE orders SET status=? WHERE id=? AND status=?',[next,orderId,order.status]);
    if ((result as {affectedRows:number}).affectedRows !== 1) throw new Error('Order changed; retry');
    const [fresh]=await connection.query<OrderRow[]>('SELECT * FROM orders WHERE id=?',[orderId]);
    const [items]=await connection.query<ItemRow[]>('SELECT order_id,item_id,name,qty,unit_price FROM order_items WHERE order_id=? ORDER BY id',[orderId]);
    return mapOrder(fresh[0],items);
  });
}
