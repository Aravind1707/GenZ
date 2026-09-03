import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,getStaffByToken,loginStaff,logoutStaff} from '../../../../lib/staff-auth';
export const dynamic='force-dynamic';
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*12};
export async function GET(){const token=(await cookies()).get(COOKIE)?.value;const staff=await getStaffByToken(token);return NextResponse.json({ok:true,authenticated:!!staff,staff},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req:Request){try{const b=await req.json();if(typeof b?.username!=='string'||typeof b?.password!=='string'||b.username.length>80||b.password.length<8||b.password.length>200)return NextResponse.json({ok:false,error:'Invalid credentials'},{status:400});const result=await loginStaff(b.username,b.password);if(!result)return NextResponse.json({ok:false,error:'Invalid username or password'},{status:401});const response=NextResponse.json({ok:true,staff:result.staff});response.cookies.set(COOKIE,result.token,cookieOptions);return response;}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Unable to sign in'},{status:500});}}
export async function DELETE(){const c=await cookies();await logoutStaff(c.get(COOKIE)?.value);const response=NextResponse.json({ok:true});response.cookies.set(COOKIE,'',{...cookieOptions,maxAge:0});return response;}
