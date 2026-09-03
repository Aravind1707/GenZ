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

export const stations: Station[] = [
  ...Array.from({length:16},(_,i)=>({id:`pc-${i+1}`,name:`PC-${String(i+1).padStart(2,'0')}`,type:'PC' as const,status:'AVAILABLE' as StationStatus,hourlyRate:120,slotMinutes:60})),
  ...Array.from({length:4},(_,i)=>({id:`ps5-${i+1}`,name:`PS5-${String(i+1).padStart(2,'0')}`,type:'PS5' as const,status:'AVAILABLE' as StationStatus,hourlyRate:180,slotMinutes:60})),
  ...Array.from({length:4},(_,i)=>({id:`moza-${i+1}`,name:`MOZA-${String(i+1).padStart(2,'0')}`,type:'MOZA' as const,status:'AVAILABLE' as StationStatus,hourlyRate:300,slotMinutes:30})),
];

export const sessions: Session[] = [];
export const orders: Order[] = [];

export function listStations(){ return stations; }
export function listSessions(){ return sessions; }
export function listOrders(){ return orders; }

export function startSession(input:{stationId:string; customerName:string; memberId?:string}){
  const station = stations.find(s=>s.id===input.stationId);
  if(!station) throw new Error('Station not found');
  if(station.status !== 'AVAILABLE') throw new Error('Station is not available');
  const session:Session={id:id('SES'),stationId:station.id,customerName:input.customerName.trim() || 'Walk-in',memberId:input.memberId?.trim(),status:'ACTIVE',startedAt:now(),token:crypto.randomUUID(),balance:0};
  sessions.push(session); station.status='ACTIVE'; return session;
}

export function endSession(sessionId:string){
  const session=sessions.find(s=>s.id===sessionId); if(!session) throw new Error('Session not found');
  if(session.status==='ENDED') return session;
  session.status='ENDED'; session.endedAt=now();
  const station=stations.find(s=>s.id===session.stationId); if(station) station.status='AVAILABLE';
  return session;
}

export function createOrder(input:{sessionId:string; items:OrderItem[]; paymentMode:PaymentMode}){
  const session=sessions.find(s=>s.id===input.sessionId); if(!session || session.status==='ENDED') throw new Error('Active session required');
  if(!input.items.length) throw new Error('Order must contain at least one item');
  const total=input.items.reduce((sum,item)=>sum+(item.qty*item.unitPrice),0);
  const order:Order={id:id('ORD'),sessionId:session.id,stationId:session.stationId,items:input.items,status:'NEW',paymentMode:input.paymentMode,createdAt:now(),total};
  orders.push(order); if(input.paymentMode==='ADD_TO_BILL') session.balance += total; return order;
}

export function advanceOrder(orderId:string){
  const order=orders.find(o=>o.id===orderId); if(!order) throw new Error('Order not found');
  const flow:OrderStatus[]=['NEW','ACCEPTED','PREPARING','READY','DELIVERED'];
  const index=flow.indexOf(order.status); if(index<flow.length-1) order.status=flow[index+1]; return order;
}
