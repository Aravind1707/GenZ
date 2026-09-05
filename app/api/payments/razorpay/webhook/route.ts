import {NextResponse} from 'next/server';
import {markPaid} from '../../../../../lib/food-orders';
import {verifyRazorpayWebhook} from '../../../../../lib/razorpay';
import {pool,transaction} from '../../../../../lib/mysql';
import {randomUUID} from 'node:crypto';

export async function POST(req:Request){
 const raw=await req.text();
 if(raw.length>256000)return NextResponse.json({ok:false},{status:413});
 const sig=req.headers.get('x-razorpay-signature')||'';
 if(!verifyRazorpayWebhook(raw,sig))return NextResponse.json({ok:false},{status:400});
 try{
  const e=JSON.parse(raw) as any,p=e.payload?.payment?.entity,r=e.payload?.refund?.entity,o=e.payload?.order?.entity;
  const eventId=String(req.headers.get('x-razorpay-event-id')||e.id||'').slice(0,160);if(!eventId)return NextResponse.json({ok:false},{status:400});
  await transaction(async(c)=>{
   const[old]=await c.query<any[]>('SELECT id,processed FROM payment_provider_events WHERE provider=? AND event_id=? LIMIT 1',['RAZORPAY',eventId]);
   if(old[0]?.processed)return;
   const eventDbId=old[0]?String(old[0].id):`PEVT-${randomUUID()}`;
   if(!old[0])await c.execute('INSERT INTO payment_provider_events(id,provider,event_id,event_type,payload,signature_verified,processed,received_at) VALUES(?,?,?,?,?,TRUE,FALSE,NOW(3))',[eventDbId,'RAZORPAY',eventId,String(e.event||'unknown'),raw]);
   const orderId=typeof o?.id==='string'?o.id:(typeof p?.order_id==='string'?p.order_id:'');const paymentId=typeof p?.id==='string'?p.id:'';
   if(['order.paid','payment.captured'].includes(String(e.event))&&orderId&&paymentId&&p?.currency==='INR'&&p?.status==='captured'){
    const[rw]=await c.query<any[]>('SELECT id,total,payment_mode FROM orders WHERE razorpay_order_id=? LIMIT 1',[orderId]);
    if(rw[0]&&rw[0].payment_mode==='PAY_NOW'&&Number(p.amount)===Number(rw[0].total)*100){await c.execute('UPDATE payment_transactions SET provider_status=\'captured\',provider_updated_at=NOW(3),provider_payload=? WHERE provider=\'RAZORPAY\' AND provider_order_id=?',[raw,orderId]);await markPaid(String(rw[0].id),paymentId,orderId);}
   }
   if(e.event==='payment.failed'&&paymentId)await c.execute('UPDATE payment_transactions SET provider_status=\'failed\',provider_updated_at=NOW(3),provider_payload=? WHERE provider=\'RAZORPAY\' AND provider_payment_id=?',[raw,paymentId]);
   if(r?.id&&r?.payment_id){const s=String(r.status||'').toLowerCase();const ps=['processed','completed'].includes(s)?'SUCCEEDED':['failed','rejected'].includes(s)?'FAILED':'PENDING';await c.execute('UPDATE session_payment_refunds SET provider_status=?,external_reference=? WHERE provider=\'RAZORPAY\' AND (external_reference=? OR external_reference IS NULL)',[ps,String(r.id),String(r.payment_id)]);}
   await c.execute('UPDATE payment_provider_events SET processed=TRUE,processed_at=NOW(3) WHERE id=?',[eventDbId]);
  });
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({ok:false},{status:400});}
}
