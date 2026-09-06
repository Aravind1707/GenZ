import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {listFeatures} from '../../../lib/features';
import {COOKIE,requireStaff} from '../../../lib/staff-auth';
export async function GET(){try{await requireStaff((await cookies()).get(COOKIE)?.value);return NextResponse.json({ok:true,features:await listFeatures().then(rows=>Object.fromEntries(rows.map(r=>[r.feature_key,r.enabled])))},{headers:{'Cache-Control':'no-store'}})}catch(e){const m=e instanceof Error?e.message:'FEATURE_STATUS_UNAVAILABLE';return NextResponse.json({ok:false,error:m},{status:m==='STAFF_UNAUTHORIZED'?401:503})}}
