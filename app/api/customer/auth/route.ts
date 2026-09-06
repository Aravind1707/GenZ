import { NextResponse } from 'next/server';
import { requestCustomerOtp, verifyCustomerOtp } from '../../../../lib/customer-auth';

export async function POST(request:Request){
  try{
    const len=Number(request.headers.get('content-length')||0);if(len>16_384)return NextResponse.json({ok:false,error:'Request body too large'},{status:413});
    const body=await request.json();
    const action=body?.action;
    const sourceKey=process.env.GENZ_TRUST_PROXY==='true'?(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')?.trim()||'unknown'):'unknown';
    if(action==='request')return NextResponse.json({ok:true,...await requestCustomerOtp(typeof body?.mobile==='string'?body.mobile:'',sourceKey)});
    if(action==='verify'){
      const result=await verifyCustomerOtp(typeof body?.challengeId==='string'?body.challengeId:'',typeof body?.mobile==='string'?body.mobile:'',typeof body?.otp==='string'?body.otp:'',sourceKey);
      const response=NextResponse.json({ok:true,customer:result.customer});
      response.cookies.set('genz_customer',result.token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*24*60*60});
      return response;
    }
    return NextResponse.json({ok:false,error:'Invalid request'},{status:400});
  }catch(e){
    const message=e instanceof Error?e.message:'Unable to process login request';
    if(message==='Too many OTP requests. Try again later'||message==='Too many OTP verification attempts. Try again later')return NextResponse.json({ok:false,error:'Too many attempts. Try again later.'},{status:429});
    const publicMessages=new Set(['Invalid mobile number','Please wait before requesting another OTP','OTP expired or invalid','Invalid verification request','OTP delivery failed','OTP provider is not configured']);
    if(publicMessages.has(message))return NextResponse.json({ok:false,error:message},{status:400});
    console.error('[customer-auth]',message);
    return NextResponse.json({ok:false,error:process.env.NODE_ENV==='production'?'Unable to process login request':`Unable to process login request: ${message}`},{status:400});
  }
}
