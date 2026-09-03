import { NextResponse } from 'next/server';
import { requestCustomerOtp, verifyCustomerOtp } from '../../../../lib/customer-auth';

export async function POST(request:Request) {
  try {
    const body=await request.json();
    const action=body?.action;
    if(action==='request') return NextResponse.json({ok:true,...await requestCustomerOtp(typeof body?.mobile==='string'?body.mobile:'')});
    if(action==='verify') {
      const result=await verifyCustomerOtp(typeof body?.challengeId==='string'?body.challengeId:'',typeof body?.mobile==='string'?body.mobile:'',typeof body?.otp==='string'?body.otp:'');
      const response=NextResponse.json({ok:true,customer:result.customer});
      response.cookies.set('genz_customer',result.token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*24*60*60});
      return response;
    }
    return NextResponse.json({ok:false,error:'Invalid request'},{status:400});
  } catch { return NextResponse.json({ok:false,error:'Unable to process login request'},{status:400}); }
}
