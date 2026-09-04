import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,requireStaff,audit} from '../../../../lib/staff-auth';
import {getSessionSettlement,settleSession} from '../../../../lib/session-settlement';
import {publish} from '../../../../lib/realtime';

const methods=['CASH','UPI','CARD','RAZORPAY','OTHER'] as const;
const fail=(e:unknown)=>{const m=e instanceof Error?e.message:'';const status=m==='STAFF_UNAUTHORIZED'?401:m==='STAFF_FORBIDDEN'?403:m==='SESSION_NOT_FOUND'?404:m.includes('EXCEEDS')||m.includes('MUST_BE')||m.includes('OPEN_GROUP')?409:400;return NextResponse.json({ok:false,error:m||'Unable to settle session'},{status})};

export const dynamic='force-dynamic';

export async function GET(req:Request){try{await requireStaff((await cookies()).get(COOKIE)?.value,'sessions:read');const id=new URL(req.url).searchParams.get('sessionId')?.trim()||'';if(!id||id.length>64)return NextResponse.json({ok:false,error:'Invalid session ID'},{status:400});return NextResponse.json({ok:true,settlement:await getSessionSettlement(id)},{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}}

export async function POST(req:Request){try{const staff=await requireStaff((await cookies()).get(COOKIE)?.value,'sessions:write');const len=Number(req.headers.get('content-length')||0);if(len>4096)return NextResponse.json({ok:false,error:'Request body too large'},{status:413});const b=await req.json();const sessionId=typeof b?.sessionId==='string'?b.sessionId.trim():'';const method=b?.method;const amount=Number(b?.amount);const idem=req.headers.get('Idempotency-Key')?.trim()||undefined;if(!sessionId||!methods.includes(method)||!Number.isSafeInteger(amount)||amount<=0)return NextResponse.json({ok:false,error:'Invalid settlement request'},{status:400});const result=await settleSession({sessionId,amount,method,staffId:staff.id,idempotencyKey:idem});await audit(staff.id,'SESSION_SETTLEMENT_CAPTURED','session',sessionId,{settlementId:result.settlementId,amount:result.amount,method:result.method,existing:result.existing});publish('PAYMENT_CAPTURED',{sessionId,settlementId:result.settlementId,amount:result.amount,method:result.method});return NextResponse.json({ok:true,settlement:result},{status:result.existing?200:201})}catch(e){return fail(e)}}
