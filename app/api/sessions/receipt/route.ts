import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,requireStaff} from '../../../../lib/staff-auth';
import {getSessionReceipt} from '../../../../lib/receipt';

export async function GET(req:Request){
  try{
    await requireStaff((await cookies()).get(COOKIE)?.value,'payments:read');
    const id=new URL(req.url).searchParams.get('sessionId')?.trim()||'';
    if(!id||id.length>64)return NextResponse.json({ok:false,error:'sessionId is required'},{status:400});
    return NextResponse.json({ok:true,receipt:await getSessionReceipt(id)},{headers:{'Cache-Control':'no-store'}});
  }catch(e){
    const m=e instanceof Error?e.message:'';
    if(m==='STAFF_UNAUTHORIZED'||m==='STAFF_FORBIDDEN')return NextResponse.json({ok:false,error:m==='STAFF_FORBIDDEN'?'Permission denied':'Staff authorization required'},{status:m==='STAFF_FORBIDDEN'?403:401});
    return NextResponse.json({ok:false,error:m||'Unable to load receipt'},{status:m==='SESSION_NOT_FOUND'?404:400});
  }
}
