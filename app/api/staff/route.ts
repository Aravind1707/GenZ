import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,requireStaff,listStaff,createStaff,updateStaff,audit} from '../../../lib/staff-auth';
export const dynamic='force-dynamic';
const auth=async()=>requireStaff((await cookies()).get(COOKIE)?.value,'staff:manage');
const error=(e:unknown)=>{const m=e instanceof Error?e.message:'';const status=m==='STAFF_UNAUTHORIZED'?401:m==='STAFF_FORBIDDEN'?403:m==='STAFF_NOT_FOUND'?404:400;return NextResponse.json({ok:false,error:m||'Invalid request'},{status});};
const validRole=(v:unknown)=>v==='OWNER'||v==='MANAGER';
export async function GET(){try{await auth();return NextResponse.json({ok:true,staff:await listStaff()});}catch(e){return error(e)}}
export async function POST(req:Request){try{const actor=await auth();const b=await req.json();if(!validRole(b.role))return NextResponse.json({ok:false,error:'Role must be OWNER or MANAGER'},{status:400});const staff=await createStaff({username:String(b.username||''),name:String(b.name||''),role:b.role,password:String(b.password||'')});await audit(actor.id,'STAFF_CREATED','STAFF',staff.id,{role:staff.role});return NextResponse.json({ok:true,staff},{status:201});}catch(e){return error(e)}}
export async function PATCH(req:Request){try{const actor=await auth();const b=await req.json();const id=String(b.id||'');if(!id)return NextResponse.json({ok:false,error:'Missing staff id'},{status:400});if(b.role!==undefined&&!validRole(b.role))return NextResponse.json({ok:false,error:'Role must be OWNER or MANAGER'},{status:400});await updateStaff(id,{name:b.name===undefined?undefined:String(b.name),role:b.role,active:b.active===undefined?undefined:Boolean(b.active),password:b.password===undefined?undefined:String(b.password)});await audit(actor.id,'STAFF_UPDATED','STAFF',id,{changed:['name','role','active',b.password!==undefined?'password':null].filter(Boolean)});return NextResponse.json({ok:true});}catch(e){return error(e)}}
