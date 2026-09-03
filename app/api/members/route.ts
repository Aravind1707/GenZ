import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {findMember} from '../../../lib/members';
import {COOKIE,requireStaff} from '../../../lib/staff-auth';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{await requireStaff((await cookies()).get(COOKIE)?.value,'members:read');const id=new URL(request.url).searchParams.get('id')?.trim()??'';if(!id||id.length>64)return NextResponse.json({ok:false,error:'Membership ID is required'},{status:400});const member=findMember(id);return NextResponse.json({ok:true,member:member?{id:member.id,name:member.name,tier:member.tier,expiresAt:member.expiresAt,active:member.active}:null},{headers:{'Cache-Control':'no-store'}})}catch(e){const m=e instanceof Error?e.message:'';return NextResponse.json({ok:false,error:m==='STAFF_FORBIDDEN'?'Permission denied':'Staff authorization required'},{status:m==='STAFF_FORBIDDEN'?403:401})}}
