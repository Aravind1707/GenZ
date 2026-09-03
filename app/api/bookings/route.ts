import { NextResponse } from 'next/server';
import { createBooking, listBookings, cancelBooking } from '../../../lib/bookings';

export async function GET(){ return NextResponse.json({ok:true,bookings:listBookings()}); }
export async function POST(request:Request){
  try { const body=await request.json(); const booking=createBooking({stationId:String(body.stationId||''),customerName:String(body.customerName||'Walk-in'),memberId:body.memberId?String(body.memberId):undefined,startsAt:String(body.startsAt||''),endsAt:String(body.endsAt||''),deposit:Number(body.deposit||0),notes:body.notes?String(body.notes):undefined,status:body.status}); return NextResponse.json({ok:true,booking},{status:201}); }
  catch(error){ return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to create booking'},{status:400}); }
}
export async function PATCH(request:Request){
  try { const body=await request.json(); return NextResponse.json({ok:true,booking:cancelBooking(String(body.bookingId||''))}); }
  catch(error){ return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to cancel booking'},{status:400}); }
}
