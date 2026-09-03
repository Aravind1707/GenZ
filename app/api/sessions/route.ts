import { NextResponse } from 'next/server';
import { listSessions, startSession, endSession } from '../../../lib/store';

export async function GET() {
  try { return NextResponse.json({ ok:true, sessions:await listSessions() }, { headers:{'Cache-Control':'no-store'} }); }
  catch { return NextResponse.json({ok:false,error:'Unable to load sessions'},{status:500}); }
}

export async function POST(request:Request) {
  try {
    const body=await request.json();
    const stationId=typeof body?.stationId==='string'?body.stationId:'';
    const customerName=typeof body?.customerName==='string'?body.customerName:'';
    const memberId=typeof body?.memberId==='string'?body.memberId:undefined;
    if(stationId.length<1||stationId.length>64||customerName.length>120||memberId&&memberId.length>64) return NextResponse.json({ok:false,error:'Invalid request'},{status:400});
    return NextResponse.json({ok:true,session:await startSession({stationId,customerName,memberId})},{status:201});
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to start session'},{status:400}); }
}

export async function PATCH(request:Request) {
  try {
    const body=await request.json(); const sessionId=typeof body?.sessionId==='string'?body.sessionId:'';
    if(!sessionId||sessionId.length>64) return NextResponse.json({ok:false,error:'Invalid request'},{status:400});
    return NextResponse.json({ok:true,session:await endSession(sessionId)});
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to end session'},{status:400}); }
}
