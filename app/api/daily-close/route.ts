import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,requireStaff,audit} from '../../../lib/staff-auth';
import {getDailyCloseReport,recordDailyCashCount} from '../../../lib/daily-close-report';

const auth=(e:unknown)=>{const m=e instanceof Error?e.message:'';return NextResponse.json({ok:false,error:m==='STAFF_FORBIDDEN'?'Permission denied':'Staff authorization required'},{status:m==='STAFF_FORBIDDEN'?403:401});};
const date=(v:string|null)=>v&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:new Date().toISOString().slice(0,10);
const str=(v:unknown)=>typeof v==='string'?v.trim():'';

export async function GET(req:Request){
  try{
    await requireStaff((await cookies()).get(COOKIE)?.value,'finance:read');
    const value=date(new URL(req.url).searchParams.get('date'))!;
    return NextResponse.json({ok:true,report:await getDailyCloseReport(value)},{headers:{'Cache-Control':'no-store'}});
  }catch(e){
    if(e instanceof Error&&(e.message==='STAFF_UNAUTHORIZED'||e.message==='STAFF_FORBIDDEN'))return auth(e);
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Unable to load daily close'},{status:400});
  }
}

export async function POST(req:Request){
  try{
    const staff=await requireStaff((await cookies()).get(COOKIE)?.value,'finance:write');
    const body=await req.json();
    const businessDate=date(str(body?.date)||null)!;
    const result=await recordDailyCashCount({date:businessDate,countedCash:Number(body?.countedCash),notes:str(body?.notes)||undefined,staffId:staff.id});
    await audit(staff.id,'DAILY_CASH_COUNT_RECORDED','daily_close',businessDate,{countedCash:Number(body?.countedCash)});
    return NextResponse.json({ok:true,count:result,report:await getDailyCloseReport(businessDate)});
  }catch(e){
    if(e instanceof Error&&(e.message==='STAFF_UNAUTHORIZED'||e.message==='STAFF_FORBIDDEN'))return auth(e);
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Unable to record cash count'},{status:400});
  }
}
