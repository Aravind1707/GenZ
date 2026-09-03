import { createHash, randomInt, randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool, transaction } from './mysql';

const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const SESSION_DAYS = 30;
const hash = (value:string) => createHash('sha256').update(value).digest('hex');
const id = (prefix:string) => `${prefix}-${randomUUID()}`;
const normalizeMobile = (value:string) => value.replace(/[^0-9+]/g,'').trim();

export async function requestCustomerOtp(rawMobile:string) {
  const mobile=normalizeMobile(rawMobile);
  if(!/^\+?[1-9]\d{9,14}$/.test(mobile)) throw new Error('Invalid mobile number');
  const otp=String(randomInt(0,1000000)).padStart(6,'0');
  const challengeId=id('OTP');
  await transaction(async(connection:PoolConnection)=>{
    await connection.execute('UPDATE customer_otp_challenges SET consumed_at=? WHERE mobile=? AND consumed_at IS NULL',[new Date(),mobile]);
    await connection.execute('INSERT INTO customer_otp_challenges(id,mobile,otp_hash,expires_at,attempts,created_at) VALUES (?,?,?,?,?,?)',[challengeId,mobile,hash(otp),new Date(Date.now()+OTP_TTL_MINUTES*60000),0,new Date()]);
  });
  // Development transport: never persist or return OTP in production. Replace this boundary with the SMS provider.
  if(process.env.NODE_ENV==='production') return {challengeId};
  return {challengeId,devOtp:otp};
}

export async function verifyCustomerOtp(challengeId:string,rawMobile:string,otp:string) {
  const mobile=normalizeMobile(rawMobile);
  if(!/^OTP-[a-f0-9-]{30,}$/.test(challengeId)||!/^\d{6}$/.test(otp)) throw new Error('Invalid verification request');
  return transaction(async(connection:PoolConnection)=>{
    const [rows]=await connection.query<(RowDataPacket & {id:string;mobile:string;otp_hash:string;expires_at:Date;attempts:number;consumed_at:Date|null})[]>('SELECT * FROM customer_otp_challenges WHERE id=? AND mobile=? FOR UPDATE',[challengeId,mobile]);
    const challenge=rows[0];
    if(!challenge||challenge.consumed_at||new Date(challenge.expires_at).getTime()<Date.now()||challenge.attempts>=MAX_ATTEMPTS) throw new Error('OTP expired or invalid');
    if(hash(otp)!==challenge.otp_hash) { await connection.execute('UPDATE customer_otp_challenges SET attempts=attempts+1 WHERE id=?',[challengeId]); throw new Error('OTP expired or invalid'); }
    await connection.execute('UPDATE customer_otp_challenges SET consumed_at=? WHERE id=?',[new Date(),challengeId]);
    const [existing]=await connection.query<(RowDataPacket & {id:string;mobile:string;name:string|null;member_id:string|null})[]>('SELECT * FROM customers WHERE mobile=? LIMIT 1',[mobile]);
    let customer=existing[0];
    if(!customer) { const customerId=id('CUS'); await connection.execute('INSERT INTO customers(id,mobile,created_at,updated_at) VALUES (?,?,?,?)',[customerId,mobile,new Date(),new Date()]); customer={id:customerId,mobile,name:null,member_id:null}; }
    const token=randomUUID();
    await connection.execute('INSERT INTO customer_sessions(id,customer_id,session_token_hash,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?,?)',[id('CS'),customer.id,hash(token),new Date(Date.now()+SESSION_DAYS*86400000),new Date(),new Date()]);
    return {token,customer:{id:customer.id,mobile:customer.mobile,name:customer.name,memberId:customer.member_id}};
  });
}

export async function getCustomerByToken(token:string) {
  if(!token) return null;
  const [rows]=await pool.query<(RowDataPacket & {id:string;mobile:string;name:string|null;member_id:string|null;member_tier:string|null;member_expires:string|null})[]>('SELECT c.id,c.mobile,c.name,c.member_id,m.tier AS member_tier,m.expires_at AS member_expires FROM customer_sessions cs JOIN customers c ON c.id=cs.customer_id LEFT JOIN members m ON m.id=c.member_id WHERE cs.session_token_hash=? AND cs.expires_at>NOW() LIMIT 1',[hash(token)]);
  return rows[0]||null;
}
