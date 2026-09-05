import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
const protectedPaths=['/','/sessions','/bookings','/orders','/finance','/kitchen','/staff','/members'];
export function middleware(request:NextRequest){
  const requestId=request.headers.get('x-request-id')?.trim()||randomUUID();
  const path=request.nextUrl.pathname;
  if(path.startsWith('/staff-login')||path.startsWith('/api/staff')||path.startsWith('/api/customer')||path.startsWith('/customer')){const response=NextResponse.next();response.headers.set('x-request-id',requestId);return response;}
  if(protectedPaths.some(p=>p==='/'?path==='/':path===p||path.startsWith(`${p}/`))){
    if(!request.cookies.get('genz_staff')?.value){const url=request.nextUrl.clone();url.pathname='/staff-login';url.searchParams.set('next',path);const response=NextResponse.redirect(url);response.headers.set('x-request-id',requestId);return response;}
  }
  const response=NextResponse.next();response.headers.set('x-request-id',requestId);return response;
}
export const config={matcher:['/','/sessions/:path*','/bookings/:path*','/orders/:path*','/finance/:path*','/kitchen/:path*','/staff/:path*','/members/:path*','/api/:path*']};
