import { NextResponse } from 'next/server';
import { createOrder, listOrders, advanceOrder, type OrderItem, type PaymentMode } from '@/lib/store';

export async function GET(){ return NextResponse.json({ok:true,orders:listOrders()}); }

export async function POST(request:Request){
  try {
    const body=await request.json();
    const items=Array.isArray(body.items)?body.items as OrderItem[]:[];
    const paymentMode=(body.paymentMode||'ADD_TO_BILL') as PaymentMode;
    const order=createOrder({sessionId:String(body.sessionId||''),items,paymentMode});
    return NextResponse.json({ok:true,order},{status:201});
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to create order'},{status:400}); }
}

export async function PATCH(request:Request){
  try { const body=await request.json(); return NextResponse.json({ok:true,order:advanceOrder(String(body.orderId||''))}); }
  catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to update order'},{status:400}); }
}
