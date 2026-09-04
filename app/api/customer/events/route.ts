import {cookies} from 'next/headers';
import {getCustomerByToken} from '../../../../lib/customer-auth';
import {pool} from '../../../../lib/mysql';
import {subscribe} from '../../../../lib/realtime';
export const dynamic='force-dynamic';
export const runtime='nodejs';

async function owns(customerId:string,event:any){
 const sessionId=typeof event?.sessionId==='string'?event.sessionId:'';
 if(sessionId){const[rows]=await pool.query<any[]>('SELECT 1 FROM session_participants WHERE session_id=? AND customer_id=? AND active=TRUE LIMIT 1',[sessionId,customerId]);if(rows.length)return true;}
 const orderId=typeof event?.orderId==='string'?event.orderId:'';
 if(orderId){const[rows]=await pool.query<any[]>('SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN session_participants p ON p.id=oi.participant_id WHERE o.id=? AND p.customer_id=? LIMIT 1',[orderId,customerId]);if(rows.length)return true;}
 return false;
}

export async function GET(){
 const token=(await cookies()).get('genz_customer')?.value;
 const customer=token?await getCustomerByToken(token):null;
 if(!customer)return new Response('Unauthorized',{status:401});
 const encoder=new TextEncoder();let cleanup=()=>{};
 const stream=new ReadableStream<Uint8Array>({start(controller){
  const send=(payload:unknown)=>{try{controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))}catch{cleanup()}};
  send({type:'CONNECTED',createdAt:new Date().toISOString()});
  const unsubscribe=subscribe((event)=>{void (async()=>{try{if(await owns(customer.id,event))send(event)}catch{}})()});
  const heartbeat=setInterval(()=>send({type:'HEARTBEAT',createdAt:new Date().toISOString()}),15000);
  cleanup=()=>{clearInterval(heartbeat);unsubscribe();try{controller.close()}catch{}};
 },cancel(){cleanup()}});
 return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'}});
}
