import type { RowDataPacket } from 'mysql2/promise';
import { pool } from './mysql';

export type CustomerPricing={isMember:boolean;tier?:string;gaming:Array<{id:string;label:string;stationType:string;pcTier?:string;specs?:string;imageUrl?:string;regularPrice:number;memberPrice:number;unitLabel:string}>;food:Array<{id:string;name:string;category:string;imageUrl?:string;regularPrice:number;memberPrice:number}>};

export async function getCustomerPricing(memberId?:string|null):Promise<CustomerPricing>{
 const memberQuery=memberId?await pool.query<(RowDataPacket & {tier:string;expires_at:string;active:number})[]>('SELECT tier,expires_at,active FROM members WHERE id=? LIMIT 1',[memberId]):[[] as any];
 const member=memberQuery[0][0]; const activeMember=!!member&&!!member.active&&new Date(`${member.expires_at}T23:59:59`).getTime()>=Date.now();
 const [gaming]=await pool.query<(RowDataPacket & {id:string;label:string;station_type:string;pc_tier:string|null;specs:string|null;image_url:string|null;regular_price:number;member_price:number;unit_label:string})[]>('SELECT id,label,station_type,pc_tier,specs,image_url,regular_price,member_price,unit_label FROM gaming_rates WHERE active=TRUE ORDER BY FIELD(station_type,"PC","PS5","PS4","PSVR","MOZA"),pc_tier,label');
 const [food]=await pool.query<(RowDataPacket & {id:string;name:string;category:string;image_url:string|null;member_price:number;non_member_price:number})[]>('SELECT id,name,category,image_url,member_price,non_member_price FROM menu_items WHERE active=TRUE ORDER BY category,name');
 return {isMember:activeMember,tier:activeMember?member.tier:undefined,gaming:gaming.map(r=>({id:r.id,label:r.label,stationType:r.station_type,pcTier:r.pc_tier||undefined,specs:r.specs||undefined,imageUrl:r.image_url||undefined,regularPrice:Number(r.regular_price),memberPrice:Number(r.member_price),unitLabel:r.unit_label})),food:food.map(r=>({id:r.id,name:r.name,category:r.category,imageUrl:r.image_url||undefined,regularPrice:Number(r.non_member_price),memberPrice:Number(r.member_price)}))};
}
