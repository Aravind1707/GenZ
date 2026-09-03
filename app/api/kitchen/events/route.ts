import {cookies} from 'next/headers';
import {requireStaff,COOKIE} from '../../../../lib/staff-auth';
import {subscribe} from '../../../../lib/realtime';

export const dynamic='force-dynamic';
export const runtime='nodejs';

export async function GET(){
 await requireStaff((await cookies()).get(COOKIE)?.value,'orders:read');
 const encoder=new TextEncoder();
 let cleanup=()=>{};
 const stream=new ReadableStream<Uint8Array>({start(controller){
  const send=(payload:unknown)=>{try{controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))}catch{cleanup()}};
  send({type:'CONNECTED',createdAt:new Date().toISOString()});
  const unsubscribe=subscribe(send); cleanup=()=>{unsubscribe();try{controller.close()}catch{}};
  const heartbeat=setInterval(()=>send({type:'HEARTBEAT',createdAt:new Date().toISOString()}),15000);
  const original=cleanup; cleanup=()=>{clearInterval(heartbeat);original()};
 },cancel(){cleanup()}});
 return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'}});
}
