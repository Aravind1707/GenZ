import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,requireStaff,audit} from '../../../lib/staff-auth';
import {enableCreditAccount,suspendCreditAccount,getCreditStatement,recordCreditPayment,chargeSessionToCredit} from '../../../lib/credit-accounts';
import {attachCustomerToSession} from '../../../lib/session-customer';

const auth=(e:unknown)=>{const m=e instanceof Error?e.message:'';return NextResponse.json({ok:false,error:m==='STAFF_FORBIDDEN'?'Permission denied':'Staff authorization required'},{status:m==='STAFF_FORBIDDEN'?403:401});};
const input=(v:unknown)=>typeof v==='string'?v.trim():'';

export async function GET(req:Request){try{await requireStaff((await cookies()).get(COOKIE)?.value,'credit:read');const id=new URL(req.url).searchParams.get('customerId')||'';if(!id)return NextResponse.json({ok:false,error:'customerId is required'},{status:400});const statement=await getCreditStatement(id);return NextResponse.json({ok:true,...statement},{headers:{'Cache-Control':'no-store'}});}catch(e){if(e instanceof Error&&(e.message==='STAFF_UNAUTHORIZED'||e.message==='STAFF_FORBIDDEN'))return auth(e);return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Unable to load credit account'},{status:400});}}

export async function POST(req:Request){try{const staff=await requireStaff((await cookies()).get(COOKIE)?.value,'credit:write');const body=await req.json();const action=input(body?.action);const customerId=input(body?.customerId);if(!customerId||customerId.length>64)return NextResponse.json({ok:false,error:'Invalid customerId'},{status:400});
 if(action==='enable'){const result=await enableCreditAccount({customerId,creditLimit:Number(body?.creditLimit),billingCycle:body?.billingCycle==='MANUAL'?'MANUAL':'MONTHLY',staffId:staff.id});await audit(staff.id,'CREDIT_ACCOUNT_ENABLED','customer',customerId,{creditLimit:Number(body?.creditLimit),billingCycle:body?.billingCycle==='MANUAL'?'MANUAL':'MONTHLY'});return NextResponse.json({ok:true,account:result});}
 if(action==='suspend'){await suspendCreditAccount(customerId,staff.id);await audit(staff.id,'CREDIT_ACCOUNT_SUSPENDED','customer',customerId);return NextResponse.json({ok:true});}
 if(action==='payment'){const result=await recordCreditPayment({customerId,amount:Number(body?.amount),method:body?.method,reference:input(body?.reference)||undefined,staffId:staff.id});await audit(staff.id,'CREDIT_PAYMENT_CAPTURED','customer',customerId,{amount:result.amount,method:result.method,reference:input(body?.reference)||null});return NextResponse.json({ok:true,payment:result});}
 if(action==='attach-session'){const sessionId=input(body?.sessionId);if(!sessionId||sessionId.length>64)return NextResponse.json({ok:false,error:'sessionId is required'},{status:400});const result=await attachCustomerToSession(sessionId,customerId);await audit(staff.id,'SESSION_CUSTOMER_ATTACHED','session',sessionId,{customerId});return NextResponse.json({ok:true,session:result});}
 if(action==='charge-session'){const sessionId=input(body?.sessionId);if(!sessionId||sessionId.length>64)return NextResponse.json({ok:false,error:'sessionId is required'},{status:400});const result=await chargeSessionToCredit({sessionId,customerId,staffId:staff.id});await audit(staff.id,'SESSION_POSTED_TO_CREDIT','session',sessionId,{customerId,amount:result.amount});return NextResponse.json({ok:true,credit:result});}
 return NextResponse.json({ok:false,error:'Unknown action'},{status:400});
 }catch(e){if(e instanceof Error&&(e.message==='STAFF_UNAUTHORIZED'||e.message==='STAFF_FORBIDDEN'))return auth(e);return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Unable to update credit account'},{status:400});}}
