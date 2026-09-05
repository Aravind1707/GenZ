import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,requireStaff} from '../../../../lib/staff-auth';
import {pool} from '../../../../lib/mysql';
import type {RowDataPacket} from 'mysql2/promise';

export async function GET(req:Request){
  try{
    await requireStaff((await cookies()).get(COOKIE)?.value,'inventory:read');
    const u=new URL(req.url),limit=Math.min(Math.max(Number(u.searchParams.get('limit')||100),1),500),orderId=u.searchParams.get('orderId');
    const[rows]=await pool.query<RowDataPacket[]>(`SELECT c.id,c.order_id,c.material_id,m.name material_name,c.batch_id,c.qty,c.unit_cost,c.total_cost,c.created_at FROM inventory_cogs_ledger c JOIN inventory_materials m ON m.id=c.material_id ${orderId?'WHERE c.order_id=?':''} ORDER BY c.created_at DESC,c.id DESC LIMIT ${limit}`,orderId?[orderId]:[]);
    const[summary]=await pool.query<RowDataPacket[]>(`SELECT COUNT(*) entries,COALESCE(SUM(total_cost),0) total_cost,COALESCE(SUM(qty),0) quantity FROM inventory_cogs_ledger ${orderId?'WHERE order_id=?':''}`,orderId?[orderId]:[]);
    return NextResponse.json({ok:true,entries:rows.map(r=>({id:String(r.id),orderId:String(r.order_id),materialId:String(r.material_id),materialName:String(r.material_name),batchId:String(r.batch_id),qty:Number(r.qty),unitCost:Number(r.unit_cost),totalCost:Number(r.total_cost),createdAt:new Date(r.created_at).toISOString()})),summary:{entries:Number(summary[0]?.entries||0),totalCost:Number(summary[0]?.total_cost||0),quantity:Number(summary[0]?.quantity||0)}});
  }catch(e){const m=e instanceof Error?e.message:'Inventory COGS request failed';return NextResponse.json({ok:false,error:m},{status:m==='STAFF_FORBIDDEN'?403:m==='STAFF_UNAUTHORIZED'?401:400})}
}
