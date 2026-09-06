import {pool} from './mysql';
import {audit, type Staff} from './staff-auth';
import type {RowDataPacket} from 'mysql2/promise';
export type FeatureKey='dashboard'|'sessions'|'bookings'|'food_orders'|'kitchen'|'inventory'|'finance'|'payments'|'members'|'stations'|'receipts'|'staff_management'|'admin_configuration'|'customer_portal'|'station_agent'|'otp'|'audit_logs';
export type FeatureFlag={feature_key:FeatureKey;enabled:boolean;description:string;updated_by:string|null;updated_at:string};
export async function listFeatures():Promise<FeatureFlag[]>{const[rows]=await pool.query<(RowDataPacket&FeatureFlag)[]>('SELECT feature_key,enabled,description,updated_by,updated_at FROM feature_flags ORDER BY feature_key');return rows}
export async function isFeatureEnabled(feature:FeatureKey){const[rows]=await pool.query<(RowDataPacket&{enabled:boolean})[]>('SELECT enabled FROM feature_flags WHERE feature_key=? LIMIT 1',[feature]);return rows.length===0?true:Boolean(rows[0].enabled)}
export async function setFeature(feature:FeatureKey,enabled:boolean,staff:Staff){if(!['OWNER','DEVELOPER'].includes(String(staff.role)))throw new Error('STAFF_FORBIDDEN');await pool.execute('UPDATE feature_flags SET enabled=?,updated_by=?,updated_at=NOW(3) WHERE feature_key=?',[enabled,staff.id,feature]);await audit(staff.id,enabled?'FEATURE_ENABLED':'FEATURE_DISABLED','feature',feature,{enabled})}
export async function requireFeature(feature:FeatureKey){if(!(await isFeatureEnabled(feature)))throw new Error('FEATURE_DISABLED')}
