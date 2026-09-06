import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {pool} from '../../../../../lib/mysql';
import {requireStaff,COOKIE} from '../../../../../lib/staff-auth';
import {listFeatures,setFeature,type FeatureKey} from '../../../../../lib/features';
import type {RowDataPacket} from 'mysql2/promise';
async function auth(){const staff=await requireStaff((await cookies()).get(COOKIE)?.value);if(staff.role!=='DEVELOPER')throw new Error('STAFF_FORBIDDEN');return staff}
function fail(e:unknown){const m=e instanceof Error?e.message:'Developer request failed';return NextResponse.json({ok:false,error:m},{status:m==='STAFF_UNAUTHORIZED'?401:m==='STAFF_FORBIDDEN'?403:400})}
export async function GET(){try{await auth();const features=await listFeatures();const[logs]=await pool.query<(RowDataPacket&{id:number;staff_id:string|null;username:string|null;name:string|null;role:string|null;action:string;entity_type:string|null;entity_id:string|null;details:string|null;created_at:string})[]>(`SELECT a.id,a.staff_id,u.username,u.name,u.role,a.action,a.entity_type,a.entity_id,a.details,a.created_at FROM audit_log a LEFT JOIN staff_users u ON u.id=a.staff_id ORDER BY a.created_at DESC,a.id DESC LIMIT 500`);return NextResponse.json({ok:true,features,logs},{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}}
export async function POST(req:Request){try{const staff=await auth();const body=await req.json();const feature=String(body?.feature||'') as FeatureKey;if(!feature||!['dashboard','sessions','bookings','food_orders','kitchen','inventory','finance','payments','members','stations','receipts','staff_management','admin_configuration','customer_portal','station_agent','otp','audit_logs'].includes(feature))throw new Error('INVALID_FEATURE');await setFeature(feature,Boolean(body?.enabled),staff);return NextResponse.json({ok:true,feature,enabled:Boolean(body?.enabled)})}catch(e){return fail(e)}}
