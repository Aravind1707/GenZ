import {NextResponse} from 'next/server';
import type {RowDataPacket} from 'mysql2/promise';
import {getCustomerByToken} from '../../../../lib/customer-auth';
import {pool} from '../../../../lib/mysql';
import {cancelFoodOrderByCustomer} from '../../../../lib/food-orders';
import {publish} from '../../../../lib/realtime';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const token=(await (await import('next/headers')).cookies()).get('genz_customer')?.value,c=token?await getCustomerByToken(token):null;
  if(!c)return NextResponse.json({ok:false,error:'Login required'},{status:401});
  const[orders]=await pool.query<RowDataPacket[]>('SELECT o.id,o.session_id,o.station_id,o.status,o.payment_mode,o.payment_status,o.total,o.created_at,o.paid_at,COUNT(oi.id) item_count,fr.id refund_id,fr.amount refund_amount,fr.max_amount refund_max_amount,fr.policy_percent refund_policy_percent,fr.status refund_status FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN session_participants p ON p.id=oi.participant_id LEFT JOIN food_order_refunds fr ON fr.order_id=o.id WHERE p.customer_id=? GROUP BY o.id,o.session_id,o.station_id,o.status,o.payment_mode,o.payment_status,o.total,o.created_at,o.paid_at,fr.id,fr.amount,fr.max_amount,fr.policy_percent,fr.status ORDER BY o.created_at DESC LIMIT 50',[c.id]);
  const result=[];
  for(const o of orders){
   const[items]=await pool.query<RowDataPacket[]>('SELECT name,qty,unit_price FROM order_items WHERE order_id=? ORDER BY id',[o.id]);
   result.push({id:String(o.id),sessionId:String(o.session_id),stationId:String(o.station_id),status:String(o.status),paymentMode:String(o.payment_mode),paymentStatus:String(o.payment_status),total:Number(o.total),createdAt:new Date(o.created_at).toISOString(),paidAt:o.paid_at?new Date(o.paid_at).toISOString():null,refund:o.refund_id?{id:String(o.refund_id),amount:Number(o.refund_amount),maxAmount:Number(o.refund_max_amount),policyPercent:Number(o.refund_policy_percent),status:String(o.refund_status)}:null,items:items.map(i=>({name:String(i.name),qty:Number(i.qty),unitPrice:Number(i.unit_price)}))});
  }
  return NextResponse.json({ok:true,orders:result},{headers:{'Cache-Control':'private,no-store'}});
 }catch{return NextResponse.json({ok:false,error:'Unable to load orders'},{status:500});}
}
export async function PATCH(req:Request){
 try{
  const token=(await (await import('next/headers')).cookies()).get('genz_customer')?.value,c=token?await getCustomerByToken(token):null;
  if(!c)return NextResponse.json({ok:false,error:'Login required'},{status:401});
  const b=await req.json().catch(()=>null);if(!b||b.action!=='cancel'||typeof b.orderId!=='string')return NextResponse.json({ok:false,error:'Invalid request'},{status:400});
  const result=await cancelFoodOrderByCustomer(b.orderId,c.id);publish('ORDER_STATUS_CHANGED',{orderId:b.orderId,status:'CANCELLED'});
  return NextResponse.json({ok:true,status:'CANCELLED',refund:result.refund?{maxRefund:result.refund.maxRefund,policyPercent:result.refund.policyPercent,method:'ADMIN_DESK_CASH',message:'Refund is available at the Admin Desk; it is not automatically sent online.'}:null});
 }catch(e){const m=e instanceof Error?e.message:'Unable to cancel order';return NextResponse.json({ok:false,error:m},{status:m==='Login required'?401:400});}
}
