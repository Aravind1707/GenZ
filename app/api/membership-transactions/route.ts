import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {requireStaff,audit,COOKIE} from '../../../lib/staff-auth';
import {listMembershipTransactions,renewMembership} from '../../../lib/membership-transactions';

export const dynamic='force-dynamic';
const auth=async(p:string)=>requireStaff((await cookies()).get(COOKIE)?.value,p);
const fail=(e:unknown)=>{const m=e instanceof Error?e.message:'';const status=m==='STAFF_UNAUTHORIZED'?401:m==='STAFF_FORBIDDEN'?403:m==='MEMBER_NOT_FOUND'?404:400;return NextResponse.json({ok:false,error:m||'Invalid request'},{status})};

export async function GET(req:Request){try{await auth('members:read');const id=new URL(req.url).searchParams.get('memberId')?.trim()||'';if(!id)return NextResponse.json({ok:false,error:'Member ID is required'},{status:400});return NextResponse.json({ok:true,transactions:await listMembershipTransactions(id)},{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}}

export async function POST(req:Request){try{const actor=await auth('members:write');const b=await req.json();const result=await renewMembership({memberId:String(b.memberId||''),newExpiresAt:String(b.newExpiresAt||''),amount:Number(b.amount),method:b.method,staffId:actor.id});await audit(actor.id,'MEMBERSHIP_RENEWED','MEMBER',result.memberId,{transactionId:result.transactionId,amount:result.amount,method:result.method,newExpiresAt:result.newExpiresAt});return NextResponse.json({ok:true,result},{status:201})}catch(e){return fail(e)}}
