import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,requireStaff,audit} from '../../../../lib/staff-auth';
import {recordBookingDeposit,listBookingDepositPayments,bookingDepositSummary} from '../../../../lib/booking-deposits';
import {publish} from '../../../../lib/realtime';

export const dynamic='force-dynamic';
const auth=async(p:string)=>requireStaff((await cookies()).get(COOKIE)?.value,p);
const fail=(e:unknown)=>{const m=e instanceof Error?e.message:'';const status=m==='STAFF_UNAUTHORIZED'?401:m==='STAFF_FORBIDDEN'?403:m==='BOOKING_NOT_FOUND'?404:400;return NextResponse.json({ok:false,error:m||'Invalid request'},{status})};

export async function GET(req:Request){try{await auth('bookings:read');const id=new URL(req.url).searchParams.get('bookingId')?.trim()||'';if(!id)return NextResponse.json({ok:false,error:'Booking ID is required'},{status:400});const[summary,payments]=await Promise.all([bookingDepositSummary(id),listBookingDepositPayments(id)]);return NextResponse.json({ok:true,summary,payments},{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}}

export async function POST(req:Request){try{const staff=await auth('bookings:write');const b=await req.json();const bookingId=String(b.bookingId||'').trim();const result=await recordBookingDeposit({bookingId,amount:Number(b.amount),method:b.method,staffId:staff.id});await audit(staff.id,'BOOKING_DEPOSIT_CAPTURED','booking',bookingId,{paymentId:result.paymentId,amount:result.amount,method:result.method});publish('BOOKING_UPDATED',{bookingId,depositPaid:result.paidAmount,depositOutstanding:result.outstanding});return NextResponse.json({ok:true,result},{status:201})}catch(e){return fail(e)}}
