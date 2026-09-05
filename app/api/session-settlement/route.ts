import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,requireStaff,audit} from '../../../lib/staff-auth';
import {getSessionSettlement,settleSession} from '../../../lib/session-settlement';
import {chargeSessionToCredit} from '../../../lib/credit-accounts';

const auth=(e:unknown)=>{const m=e instanceof Error?e.message:'';return NextResponse.json({ok:false,error:m==='STAFF_FORBIDDEN'?'Permission denied':'Staff authorization required'},{status:m==='STAFF_FORBIDDEN'?403:401});};
const str=(v:unknown)=>typeof v==='string'?v.trim():'';

export async function GET(req:Request){try{await requireStaff((await cookies()).get(COOKIE)?.value,'payments:read');const sessionId=new URL(req.url).searchParams.get('sessionId')||'';if(!sessionId)return NextResponse.json({ok:false,error:'sessionId is required'},{status:400});return NextResponse.json({ok:true,settlement:await getSessionSettlement(sessionId)},{headers:{'Cache-Control':'no-store'}});}catch(e){if(e instanceof Error&&(e.message==='STAFF_UNAUTHORIZED'||e.message==='STAFF_FORBIDDEN'))return auth(e);return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Unable to load final bill'},{status:400});}}

export async function POST(req:Request){try{const staff=await requireStaff((await cookies()).get(COOKIE)?.value,'payments:write');const body=await req.json();const action=str(body?.action);const sessionId=str(body?.sessionId);if(!sessionId||sessionId.length>64)return NextResponse.json({ok:false,error:'Invalid sessionId'},{status:400});
 if(action==='settle'){const amount=Number(body?.amount);const result=await settleSession({sessionId,amount,method:body?.method,staffId:staff.id,idempotencyKey:str(body?.idempotencyKey)||undefined});await audit(staff.id,'SESSION_PAYMENT_CAPTURED','session',sessionId,{amount:result.amount,method:result.method,outstandingAfter:result.outstandingAfter});return NextResponse.json({ok:true,payment:result,settlement:await getSessionSettlement(sessionId)});}
 if(action==='credit'){const customerId=str(body?.customerId);if(!customerId)return NextResponse.json({ok:false,error:'customerId is required'},{status:400});const result=await chargeSessionToCredit({sessionId,customerId,staffId:staff.id});await audit(staff.id,'SESSION_MOVED_TO_MONTHLY_CREDIT','session',sessionId,{customerId,amount:result.amount});return NextResponse.json({ok:true,credit:result,settlement:await getSessionSettlement(sessionId)});}
 return NextResponse.json({ok:false,error:'Unknown action'},{status:400});
 }catch(e){if(e instanceof Error&&(e.message==='STAFF_UNAUTHORIZED'||e.message==='STAFF_FORBIDDEN'))return auth(e);return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Unable to settle session'},{status:400});}}
