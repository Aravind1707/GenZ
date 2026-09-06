import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE,requireStaff} from '../../../../lib/staff-auth';
import {pool} from '../../../../lib/mysql';
export async function GET(){try{await requireStaff((await cookies()).get(COOKIE)?.value,'inventory:read');const [rows]=await pool.query('SELECT id,name,category,active FROM menu_items ORDER BY active DESC,category,name');return NextResponse.json({ok:true,menuItems:rows},{headers:{'Cache-Control':'no-store'}})}catch(e){const m=e instanceof Error?e.message:'Unable to load menu items';return NextResponse.json({ok:false,error:m},{status:m==='STAFF_FORBIDDEN'?403:m==='STAFF_UNAUTHORIZED'?401:400})}}
