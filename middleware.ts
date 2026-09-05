import {NextRequest,NextResponse} from 'next/server';

const protectedPaths=['/','/sessions','/bookings','/orders','/finance','/kitchen','/staff','/members'];
const unsafeMethods=new Set(['POST','PUT','PATCH','DELETE']);
const requestIdPattern=/^[A-Za-z0-9._:-]{1,128}$/;

function sameOriginRequest(request:NextRequest){
  const origin=request.headers.get('origin')?.trim();
  if(!origin)return true;
  let expectedOrigin=request.nextUrl.origin;
  const configured=process.env.GENZ_PUBLIC_BASE_URL?.trim();
  if(configured){try{expectedOrigin=new URL(configured).origin}catch{}}
  try{return new URL(origin).origin===expectedOrigin}catch{return false}
}

export function middleware(request:NextRequest){
  const suppliedRequestId=request.headers.get('x-request-id')?.trim();
  const requestId=suppliedRequestId&&requestIdPattern.test(suppliedRequestId)?suppliedRequestId:crypto.randomUUID();
  const path=request.nextUrl.pathname;

  if(unsafeMethods.has(request.method)&&request.headers.has('origin')&&!sameOriginRequest(request)){
    const response=NextResponse.json({ok:false,error:'Cross-origin request blocked'},{status:403});
    response.headers.set('x-request-id',requestId);
    return response;
  }

  if(path.startsWith('/staff-login')||path.startsWith('/api/staff')||path.startsWith('/api/customer')||path.startsWith('/customer')){
    const response=NextResponse.next();
    response.headers.set('x-request-id',requestId);
    return response;
  }

  if(protectedPaths.some(p=>p==='/'?path==='/':path===p||path.startsWith(`${p}/`))){
    if(!request.cookies.get('genz_staff')?.value){
      const url=request.nextUrl.clone();
      url.pathname='/staff-login';
      url.searchParams.set('next',path);
      const response=NextResponse.redirect(url);
      response.headers.set('x-request-id',requestId);
      return response;
    }
  }

  const response=NextResponse.next();
  response.headers.set('x-request-id',requestId);
  return response;
}

export const config={matcher:['/','/sessions/:path*','/bookings/:path*','/orders/:path*','/finance/:path*','/kitchen/:path*','/staff/:path*','/members/:path*','/api/:path*']};
