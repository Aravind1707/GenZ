import {createHash,randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {pool,transaction} from './mysql';

const scrypt=promisify(scryptCallback);
const COOKIE='genz_staff';
const TTL_MS=12*60*60*1000;
export type StaffRole='OWNER'|'MANAGER'|'CASHIER'|'KITCHEN'|'FLOOR';
export type Staff={id:string;username:string;name:string;role:StaffRole};
const hashToken=(v:string)=>createHash('sha256').update(v).digest('hex');
const id=()=>`STF-${randomBytes(12).toString('hex')}`;

async function passwordHash(password:string){const salt=randomBytes(16).toString('hex');const derived=await scrypt(password,salt,64) as Buffer;return `scrypt$${salt}$${derived.toString('hex')}`;}
async function passwordMatches(password:string,stored:string){const [kind,salt,hex]=stored.split('$');if(kind!=='scrypt'||!salt||!hex)return false;const derived=await scrypt(password,salt,64) as Buffer;const expected=Buffer.from(hex,'hex');return expected.length===derived.length&&timingSafeEqual(expected,derived);}

export async function ensureInitialOwner(){
 const [rows]=await pool.query<RowDataPacket[]>('SELECT id FROM staff_users LIMIT 1');
 if(rows.length)return;
 const username=(process.env.GENZ_STAFF_INITIAL_USERNAME||'owner').trim().toLowerCase();
 const password=process.env.GENZ_STAFF_INITIAL_PASSWORD;
 if(!password) return;
 const name=process.env.GENZ_STAFF_INITIAL_NAME||'Owner';
 const hash=await passwordHash(password);
 await pool.execute('INSERT IGNORE INTO staff_users(id,username,name,password_hash,role,active,created_at,updated_at) VALUES(?,?,?,?,?,?,NOW(3),NOW(3))',[id(),username,name,hash,'OWNER',true]);
}

export async function loginStaff(username:string,password:string){
 await ensureInitialOwner();
 const [rows]=await pool.query<(RowDataPacket&{id:string;username:string;name:string;password_hash:string;role:StaffRole})[]>('SELECT id,username,name,password_hash,role FROM staff_users WHERE username=? AND active=TRUE LIMIT 1',[username.trim().toLowerCase()]);
 const user=rows[0];if(!user||!(await passwordMatches(password,user.password_hash)))return null;
 const token=randomBytes(32).toString('hex');const expires=new Date(Date.now()+TTL_MS);
 await pool.execute('INSERT INTO staff_sessions(id,staff_id,token_hash,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,NOW(3),NOW(3))',[id(),user.id,hashToken(token),expires]);
 return {token,staff:{id:user.id,username:user.username,name:user.name,role:user.role},expiresAt:expires.toISOString()};
}

export async function getStaffByToken(token?:string|null):Promise<Staff|null>{
 if(!token)return null;
 const [rows]=await pool.query<(RowDataPacket&Staff&{expires_at:string})[]>('SELECT u.id,u.username,u.name,u.role,s.expires_at FROM staff_sessions s JOIN staff_users u ON u.id=s.staff_id WHERE s.token_hash=? AND s.expires_at>NOW(3) AND u.active=TRUE LIMIT 1',[hashToken(token)]);
 const row=rows[0];if(!row)return null;
 await pool.execute('UPDATE staff_sessions SET last_seen_at=NOW(3) WHERE token_hash=?',[hashToken(token)]);
 return {id:row.id,username:row.username,name:row.name,role:row.role};
}

export const roleAllows=(role:StaffRole,permission:string)=>({OWNER:['*'],MANAGER:['sessions:read','sessions:write','orders:read','orders:write','bookings:read','bookings:write','members:read','finance:read'],CASHIER:['sessions:read','sessions:write','orders:read','orders:write','bookings:read','bookings:write','members:read'],KITCHEN:['orders:read','orders:write'],FLOOR:['sessions:read','sessions:write','bookings:read','bookings:write','members:read']}[role]||[]).some(p=>p==='*'||p===permission);

export async function requireStaff(token:string|undefined|null,permission?:string){const staff=await getStaffByToken(token);if(!staff)throw new Error('STAFF_UNAUTHORIZED');if(permission&&!roleAllows(staff.role,permission))throw new Error('STAFF_FORBIDDEN');return staff;}

export async function logoutStaff(token?:string|null){if(token)await pool.execute('DELETE FROM staff_sessions WHERE token_hash=?',[hashToken(token)]);}
export async function audit(staffId:string|undefined,action:string,entityType?:string,entityId?:string,details?:unknown){await pool.execute('INSERT INTO audit_log(staff_id,action,entity_type,entity_id,details,created_at) VALUES(?,?,?,?,?,NOW(3))',[staffId||null,action,entityType||null,entityId||null,details===undefined?null:JSON.stringify(details)]);}
export {COOKIE};
