import { NextResponse } from 'next/server';
import { createOrder, listOrders, advanceOrder, type OrderItem, type PaymentMode } from '../../../lib/store';

export async function GET() {
  try { return NextResponse.json({ok:true,orders:await listOrders()},{headers:{'Cache-Control':'no-store'}}); }
  catch { return NextResponse.json({ok:false,error:'Unable to load orders'},{status:500}); }
}

export async function POST(request:Request) {
  try {
    const body=await request.json();
    const items=Array.isArray(body?.items)?body.items as OrderItem[]:[];
    const paymentMode=body?.paymentMode as PaymentMode;
    if(typeof body?.sessionId!=='string'||body.sessionId.length<1||body.sessionId.length>64) return NextResponse.json({ok:false,error:'Invalid request'},{status:400});
    if(!['PAY_NOW','ADD_TO_BILL','WALLET'].includes(paymentMode)) return NextResponse.json({ok:false,error:'Invalid payment mode'},{status:400});
    return NextResponse.json({ok:true,order:await createOrder({sessionId:body.sessionId,items,paymentMode})},{status:201});
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to create order'},{status:400}); }
}

export async function PATCH(request:Request) {
  try {
    const body=await request.json(); const orderId=typeof body?.orderId==='string'?body.orderId:'';
    if(!orderId||orderId.length>64) return NextResponse.json({ok:false,error:'Invalid request'},{status:400});
    return NextResponse.json({ok:true,order:await advanceOrder(orderId)});
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to update order'},{status:400}); }
}
