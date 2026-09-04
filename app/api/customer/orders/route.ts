import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import type {RowDataPacket} from 'mysql2/promise';
import {getCustomerByToken} from '../../../../lib/customer-auth';
import {pool} from '../../../../lib/mysql';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const token=(await cookies()).get('genz_customer')?.value,c=token?await getCustomerByToken(token):null;
  if(!c)return NextResponse.json({ok:false,error:'Login required'},{status:401});
  const[orders]=await pool.query<RowDataPacket[]>('SELECT o.id,o.session_id,o.station_id,o.status,o.payment_mode,o.payment_status,o.total,o.created_at,o.paid_at,COUNT(oi.id) item_count FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN session_participants p ON p.id=oi.participant_id WHERE p.customer_id=? GROUP BY o.id,o.session_id,o.station_id,o.status,o.payment_mode,o.payment_status,o.total,o.created_at,o.paid_at ORDER BY o.created_at DESC LIMIT 50',[c.id]);
  const result=[];
  for(const o of orders){
   const[items]=await pool.query<RowDataPacket[]>('SELECT name,qty,unit_price FROM order_items WHERE order_id=? ORDER BY id',[o.id]);
   result.push({id:String(o.id),sessionId:String(o.session_id),stationId:String(o.station_id),status:String(o.status),paymentMode:String(o.payment_mode),paymentStatus:String(o.payment_status),total:Number(o.total),createdAt:new Date(o.created_at).toISOString(),paidAt:o.paid_at?new Date(o.paid_at).toISOString():null,items:items.map(i=>({name:String(i.name),qty:Number(i.qty),unitPrice:Number(i.unit_price)}))});
  }
  return NextResponse.json({ok:true,orders:result},{headers:{'Cache-Control':'private,no-store'}});
 }catch{return NextResponse.json({ok:false,error:'Unable to load orders'},{status:500});}
}
