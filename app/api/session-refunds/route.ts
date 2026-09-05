import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,requireStaff,audit} from '../../../lib/staff-auth';
import {listSessionRefunds,refundSessionPayment} from '../../../lib/session-refunds';

const auth=(e:unknown)=>{const m=e instanceof Error?e.message:'';return NextResponse.json({ok:false,error:m==='STAFF_FORBIDDEN'?'Permission denied':'Staff authorization required'},{status:m==='STAFF_FORBIDDEN'?403:401});};
const str=(v:unknown)=>typeof v==='string'?v.trim():'';

export async function GET(req:Request){
  try{
    await requireStaff((await cookies()).get(COOKIE)?.value,'payments:read');
    const sessionId=str(new URL(req.url).searchParams.get('sessionId'));
    if(!sessionId||sessionId.length>64)return NextResponse.json({ok:false,error:'Invalid sessionId'},{status:400});
    return NextResponse.json({ok:true,refunds:await listSessionRefunds(sessionId)},{headers:{'Cache-Control':'no-store'}});
  }catch(e){
    if(e instanceof Error&&(e.message==='STAFF_UNAUTHORIZED'||e.message==='STAFF_FORBIDDEN'))return auth(e);
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Unable to load refunds'},{status:400});
  }
}

export async function POST(req:Request){
  try{
    const staff=await requireStaff((await cookies()).get(COOKIE)?.value,'payments:write');
    const body=await req.json();
    const settlementId=str(body?.settlementId);
    const reason=str(body?.reason);
    if(!settlementId||settlementId.length>64)return NextResponse.json({ok:false,error:'Invalid settlementId'},{status:400});
    if(!reason)return NextResponse.json({ok:false,error:'Refund reason is required'},{status:400});
    const result=await refundSessionPayment({settlementId,amount:Number(body?.amount),method:body?.method,staffId:staff.id,reason,reference:str(body?.reference)||undefined,idempotencyKey:str(body?.idempotencyKey)||undefined});
    await audit(staff.id,'SESSION_PAYMENT_REFUNDED','session',result.sessionId,{settlementId,refundId:result.refundId,amount:result.amount,method:result.method,reason});
    return NextResponse.json({ok:true,refund:result});
  }catch(e){
    if(e instanceof Error&&(e.message==='STAFF_UNAUTHORIZED'||e.message==='STAFF_FORBIDDEN'))return auth(e);
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Unable to refund payment'},{status:400});
  }
}
