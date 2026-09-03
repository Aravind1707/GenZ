import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {listStations} from '../../../lib/store';
import {COOKIE,requireStaff} from '../../../lib/staff-auth';
export const dynamic='force-dynamic';
export async function GET(){try{await requireStaff((await cookies()).get(COOKIE)?.value,'sessions:read');return NextResponse.json({ok:true,stations:await listStations()},{headers:{'Cache-Control':'no-store'}});}catch(e){const forbidden=e instanceof Error&&e.message==='STAFF_FORBIDDEN';return NextResponse.json({ok:false,error:forbidden?'Permission denied':'Staff authorization required'},{status:forbidden?403:401});}}
