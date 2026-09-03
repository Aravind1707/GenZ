import { db, transaction } from './db';

export type StationType = 'PC' | 'PS5' | 'MOZA';
export type StationStatus = 'AVAILABLE' | 'BOOKED' | 'ACTIVE' | 'MAINTENANCE' | 'BLOCKED';
export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';
export type OrderStatus = 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type PaymentMode = 'PAY_NOW' | 'ADD_TO_BILL' | 'WALLET';

export type Station = { id:string; name:string; type:StationType; status:StationStatus; hourlyRate:number; slotMinutes:number; };
export type Session = { id:string; stationId:string; customerName:string; memberId?:string; status:SessionStatus; startedAt:string; pausedAt?:string; endedAt?:string; token:string; balance:number; };
export type OrderItem = { itemId:string; name:string; qty:number; unitPrice:number; };
export type Order = { id:string; sessionId:string; stationId:string; items:OrderItem[]; status:OrderStatus; paymentMode:PaymentMode; createdAt:string; total:number; };

const now = () => new Date().toISOString();
const id = (prefix:string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

function seedStations() {
  const count = Number(db.prepare('SELECT COUNT(*) as count FROM stations').get().count);
  if (count > 0) return;
  const insert = db.prepare('INSERT INTO stations(id,name,type,status,hourly_rate,slot_minutes,created_at) VALUES (?,?,?,?,?,?,?)');
  const seed = transaction(() => {
    for (let i=0;i<16;i++) insert.run(`pc-${i+1}`,`PC-${String(i+1).padStart(2,'0')}`,'PC','AVAILABLE',120,60,now());
    for (let i=0;i<4;i++) insert.run(`ps5-${i+1}`,`PS5-${String(i+1).padStart(2,'0')}`,'PS5','AVAILABLE',180,60,now());
    for (let i=0;i<4;i++) insert.run(`moza-${i+1}`,`MOZA-${String(i+1).padStart(2,'0')}`,'MOZA','AVAILABLE',300,30,now());
  });
  seed();
}
seedStations();

const mapStation = (row:any):Station => ({id:row.id,name:row.name,type:row.type,status:row.status,hourlyRate:row.hourly_rate,slotMinutes:row.slot_minutes});
const mapSession = (row:any):Session => ({id:row.id,stationId:row.station_id,customerName:row.customer_name,memberId:row.member_id||undefined,status:row.status,startedAt:row.started_at,pausedAt:row.paused_at||undefined,endedAt:row.ended_at||undefined,token:row.token,balance:row.balance});

export function listStations():Station[] { return db.prepare('SELECT * FROM stations ORDER BY type, name').all().map(mapStation); }

export function listSessions():Session[] { return db.prepare('SELECT * FROM sessions ORDER BY started_at DESC').all().map(mapSession); }

export function listOrders():Order[] {
  const rows:any[] = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const items = db.prepare('SELECT order_id,item_id,name,qty,unit_price FROM order_items ORDER BY id').all() as any[];
  const byOrder = new Map<string,OrderItem[]>();
  for (const item of items) byOrder.set(item.order_id,[...(byOrder.get(item.order_id)||[]),{itemId:item.item_id,name:item.name,qty:item.qty,unitPrice:item.unit_price}]);
  return rows.map(row => ({id:row.id,sessionId:row.session_id,stationId:row.station_id,items:byOrder.get(row.id)||[],status:row.status,paymentMode:row.payment_mode,createdAt:row.created_at,total:row.total}));
}

export function startSession(input:{stationId:string; customerName:string; memberId?:string}) {
  return transaction(() => {
    const station:any = db.prepare('SELECT * FROM stations WHERE id = ?').get(input.stationId);
    if(!station) throw new Error('Station not found');
    if(station.status !== 'AVAILABLE') throw new Error('Station is not available');
    const session:Session={id:id('SES'),stationId:station.id,customerName:input.customerName.trim() || 'Walk-in',memberId:input.memberId?.trim(),status:'ACTIVE',startedAt:now(),token:crypto.randomUUID(),balance:0};
    db.prepare('INSERT INTO sessions(id,station_id,customer_name,member_id,status,started_at,token,balance) VALUES (?,?,?,?,?,?,?,?)').run(session.id,session.stationId,session.customerName,session.memberId||null,session.status,session.startedAt,session.token,0);
    db.prepare('UPDATE stations SET status = ? WHERE id = ?').run('ACTIVE',station.id);
    return session;
  });
}

export function endSession(sessionId:string) {
  return transaction(() => {
    const row:any = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if(!row) throw new Error('Session not found');
    if(row.status !== 'ENDED') {
      db.prepare('UPDATE sessions SET status = ?, ended_at = ? WHERE id = ?').run('ENDED',now(),sessionId);
      db.prepare('UPDATE stations SET status = ? WHERE id = ?').run('AVAILABLE',row.station_id);
    }
    return mapSession(db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId));
  });
}

export function createOrder(input:{sessionId:string; items:OrderItem[]; paymentMode:PaymentMode}) {
  return transaction(() => {
    const session:any = db.prepare('SELECT * FROM sessions WHERE id = ?').get(input.sessionId);
    if(!session || session.status === 'ENDED') throw new Error('Active session required');
    if(!input.items.length) throw new Error('Order must contain at least one item');
    if(!['PAY_NOW','ADD_TO_BILL','WALLET'].includes(input.paymentMode)) throw new Error('Invalid payment mode');
    for(const item of input.items) {
      if(!item.itemId || !item.name || !Number.isInteger(item.qty) || item.qty <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) throw new Error('Invalid order item');
    }
    const total=input.items.reduce((sum,item)=>sum+(item.qty*item.unitPrice),0);
    const order:Order={id:id('ORD'),sessionId:session.id,stationId:session.station_id,items:input.items,status:'NEW',paymentMode:input.paymentMode,createdAt:now(),total};
    db.prepare('INSERT INTO orders(id,session_id,station_id,status,payment_mode,created_at,total) VALUES (?,?,?,?,?,?,?)').run(order.id,order.sessionId,order.stationId,order.status,order.paymentMode,order.createdAt,order.total);
    const insertItem=db.prepare('INSERT INTO order_items(order_id,item_id,name,qty,unit_price) VALUES (?,?,?,?,?)');
    for(const item of input.items) insertItem.run(order.id,item.itemId,item.name,item.qty,item.unitPrice);
    if(input.paymentMode==='ADD_TO_BILL') db.prepare('UPDATE sessions SET balance = balance + ? WHERE id = ?').run(total,session.id);
    return order;
  });
}

export function advanceOrder(orderId:string) {
  return transaction(() => {
    const order:any=db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if(!order) throw new Error('Order not found');
    const flow:OrderStatus[]=['NEW','ACCEPTED','PREPARING','READY','DELIVERED'];
    const index=flow.indexOf(order.status); if(index<flow.length-1) db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(flow[index+1],orderId);
    return listOrders().find(o=>o.id===orderId)!;
  });
}
