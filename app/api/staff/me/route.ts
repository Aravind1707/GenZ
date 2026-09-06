import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,requireStaff} from '../../../../lib/staff-auth';

export const dynamic='force-dynamic';

export async function GET(){
  try{
    const staff=await requireStaff((await cookies()).get(COOKIE)?.value);
    return NextResponse.json({ok:true,staff});
  }catch(e){
    const message=e instanceof Error?e.message:'STAFF_UNAUTHORIZED';
    return NextResponse.json({ok:false,error:message},{status:message==='STAFF_UNAUTHORIZED'?401:403});
  }
}
