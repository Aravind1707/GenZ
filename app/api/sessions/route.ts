import { NextResponse } from 'next/server';
import { listSessions, startSession, endSession } from '../../../lib/store';

export async function GET(){ return NextResponse.json({ok:true,sessions:listSessions()}); }

export async function POST(request:Request){
  try {
    const body=await request.json();
    const session=startSession({stationId:String(body.stationId||''),customerName:String(body.customerName||''),memberId:body.memberId?String(body.memberId):undefined});
    return NextResponse.json({ok:true,session},{status:201});
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to start session'},{status:400}); }
}

export async function PATCH(request:Request){
  try {
    const body=await request.json();
    const session=endSession(String(body.sessionId||''));
    return NextResponse.json({ok:true,session});
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to end session'},{status:400}); }
}
