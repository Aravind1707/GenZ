import {NextResponse} from 'next/server';
import {markPaid} from '../../../../../lib/food-orders';
import {verifyRazorpayWebhook} from '../../../../../lib/razorpay';
import {pool} from '../../../../../lib/mysql';

export async function POST(req:Request){const raw=await req.text();if(raw.length>256_000)return NextResponse.json({ok:false},{status:413});const sig=req.headers.get('x-razorpay-signature')||'';if(!verifyRazorpayWebhook(raw,sig))return NextResponse.json({ok:false},{status:400});try{const e=JSON.parse(raw),p=e.payload?.payment?.entity,o=e.payload?.order?.entity,orderId=typeof o?.id==='string'?o.id:(typeof p?.order_id==='string'?p.order_id:''),paymentId=typeof p?.id==='string'?p.id:'';if((e.event==='order.paid'||e.event==='payment.captured')&&orderId&&paymentId&&p?.currency==='INR'&&p?.status==='captured'){const[r]=await pool.query<any[]>('SELECT id,total,payment_status,payment_mode FROM orders WHERE razorpay_order_id=? LIMIT 1',[orderId]);if(r[0]&&r[0].payment_mode==='PAY_NOW'&&Number(p.amount)===Number(r[0].total)*100)await markPaid(String(r[0].id),paymentId,orderId)}return NextResponse.json({ok:true})}catch{return NextResponse.json({ok:false},{status:400})}}
