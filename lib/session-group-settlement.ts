import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {transaction} from './mysql';
import {calculateSessionBilling} from './gaming-billing';

export type SettlementMethod='CASH'|'UPI'|'CARD'|'RAZORPAY'|'OTHER';
export type SettlementSource={sourceType:'GAMING_SESSION'|'FOOD_ORDER_ITEM';sourceId:string;sessionId:string;orderId?:string;label:string;outstanding:number};
export type SettlementPayer={id:string;label:string;customerId?:string;amount:number};
export type GroupSettlementView={groupId:string;totalOutstanding:number;sources:SettlementSource[];settlements:Array<{id:string;method:SettlementMethod;amount:number;createdAt:string}>};
const id=(p:string)=>`${p}-${randomUUID()}`;
const money=(n:number)=>Math.max(0,Math.round(n));

async function sourcesFor(c:PoolConnection,groupId:string):Promise<SettlementSource[]>{
 const [members]=await c.query<RowDataPacket[]>('SELECT session_id FROM session_group_members WHERE group_id=?',[groupId]);
 const sessionIds=members.map(r=>String(r.session_id));
 if(!sessionIds.length)return [];
 const sources:SettlementSource[]=[];
 for(const sessionId of sessionIds){
   const billing=await calculateSessionBilling(sessionId,c);
   const [allocated]=await c.query<RowDataPacket[]>('SELECT COALESCE(SUM(amount),0) total FROM group_settlement_allocations WHERE source_type=\'GAMING_SESSION\' AND source_id=?',[sessionId]);
   const [deposit]=await c.query<RowDataPacket[]>('SELECT COALESCE(SUM(amount),0) total FROM booking_deposit_applications WHERE session_id=?',[sessionId]);
   const outstanding=Math.max(0,billing.gamingTotal-Number(allocated[0]?.total||0)-Number(deposit[0]?.total||0));
   if(outstanding>0)sources.push({sourceType:'GAMING_SESSION',sourceId:sessionId,sessionId,label:`Gaming · ${billing.stationId}`,outstanding});
 }
 const p=sessionIds.map(()=>'?').join(',');
 const [items]=await c.query<RowDataPacket[]>(`SELECT oi.id,oi.order_id,oi.item_id,oi.name,oi.qty,oi.unit_price,o.session_id,o.payment_status,o.status FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.session_id IN (${p}) AND o.status<>'CANCELLED' AND o.payment_status IN ('UNPAID','FAILED') ORDER BY oi.id`,sessionIds);
 for(const item of items){
   const itemId=String(item.id),[allocated]=await c.query<RowDataPacket[]>('SELECT COALESCE(SUM(amount),0) total FROM group_settlement_allocations WHERE source_type=\'FOOD_ORDER_ITEM\' AND source_id=?',[itemId]);
   const outstanding=Math.max(0,Number(item.qty)*Number(item.unit_price)-Number(allocated[0]?.total||0));
   if(outstanding>0)sources.push({sourceType:'FOOD_ORDER_ITEM',sourceId:itemId,sessionId:String(item.session_id),orderId:String(item.order_id),label:`Food · ${item.name} × ${item.qty}`,outstanding});
 }
 return sources;
}

export async function getGroupSettlement(groupId:string){return transaction(async c=>{const [g]=await c.query<RowDataPacket[]>('SELECT id,status FROM session_groups WHERE id=? LIMIT 1',[groupId]);if(!g[0])throw Error('Group not found');const sources=await sourcesFor(c,groupId);const[rows]=await c.query<RowDataPacket[]>('SELECT id,method,amount,created_at FROM group_settlements WHERE group_id=? AND status=\'CAPTURED\' ORDER BY created_at DESC',[groupId]);return{groupId,totalOutstanding:sources.reduce((n,s)=>n+s.outstanding,0),sources,settlements:rows.map(r=>({id:String(r.id),method:r.method as SettlementMethod,amount:Number(r.amount),createdAt:new Date(r.created_at).toISOString()}))};});}

export async function settleGroup(input:{groupId:string;method:SettlementMethod;staffId:string;payers:Array<{label:string;customerId?:string;amount:number}>;allocations?:Array<{payerIndex:number;sourceType:'GAMING_SESSION'|'FOOD_ORDER_ITEM';sourceId:string;amount:number}>}){return transaction(async c=>{
 const[groups]=await c.query<RowDataPacket[]>('SELECT id,status FROM session_groups WHERE id=? FOR UPDATE',[input.groupId]);if(!groups[0])throw Error('Group not found');if(groups[0].status!=='OPEN')throw Error('Group is closed');
 const sources=await sourcesFor(c,input.groupId);const sourceMap=new Map(sources.map(s=>[`${s.sourceType}:${s.sourceId}`,s]));
 const payers=(input.payers||[]).map(p=>({label:String(p.label||'Payer').trim().slice(0,120)||'Payer',customerId:p.customerId?String(p.customerId):undefined,amount:money(Number(p.amount))}));
 if(!payers.length||payers.length>20)throw Error('At least one payer is required');
 const total=money(payers.reduce((n,p)=>n+p.amount,0));if(!total)throw Error('Settlement amount must be greater than zero');
 const outstanding=sources.reduce((n,s)=>n+s.outstanding,0);if(total>outstanding)throw Error(`Settlement exceeds outstanding balance of ₹${outstanding}`);
 let allocations=(input.allocations||[]).map(a=>({payerIndex:Number(a.payerIndex),sourceType:a.sourceType,sourceId:String(a.sourceId),amount:money(Number(a.amount))})).filter(a=>a.amount>0);
 if(allocations.length){if(allocations.some(a=>a.payerIndex<0||a.payerIndex>=payers.length))throw Error('Invalid payer allocation');}
 else{let sourceIndex=0,sourceRemaining=sources[0]?.outstanding||0;for(let pi=0;pi<payers.length;pi++){let remaining=payers[pi].amount;while(remaining>0){while(sourceIndex<sources.length&&sourceRemaining<=0){sourceIndex++;sourceRemaining=sources[sourceIndex]?.outstanding||0}if(sourceIndex>=sources.length)throw Error('Unable to allocate settlement');const take=Math.min(remaining,sourceRemaining);allocations.push({payerIndex:pi,sourceType:sources[sourceIndex].sourceType,sourceId:sources[sourceIndex].sourceId,amount:take});remaining-=take;sourceRemaining-=take;}}}
 const allocatedTotal=money(allocations.reduce((n,a)=>n+a.amount,0));if(allocatedTotal!==total)throw Error('Payer amounts must equal allocated settlement amount');
 const payerAllocated=payers.map((_,i)=>money(allocations.filter(a=>a.payerIndex===i).reduce((n,a)=>n+a.amount,0)));if(payerAllocated.some((n,i)=>n!==payers[i].amount))throw Error('Each payer amount must equal its allocations');
 const sourceAllocated=new Map<string,number>();for(const a of allocations){const key=`${a.sourceType}:${a.sourceId}`,source=sourceMap.get(key);if(!source)throw Error('Settlement source is not outstanding for this group');const next=(sourceAllocated.get(key)||0)+a.amount;if(next>source.outstanding)throw Error(`Settlement exceeds ${source.label}`);sourceAllocated.set(key,next);}
 const settlementId=id('SET');await c.execute('INSERT INTO group_settlements(id,group_id,method,amount,status,created_by,created_at) VALUES(?,?,?,?,\'CAPTURED\',?,NOW(3))',[settlementId,input.groupId,input.method,total,input.staffId]);
 const payerIds:string[]=[];for(const p of payers){const pid=id('PAYER');payerIds.push(pid);await c.execute('INSERT INTO group_settlement_payers(id,settlement_id,customer_id,label,amount) VALUES(?,?,?,?,?)',[pid,settlementId,p.customerId||null,p.label,p.amount]);}
 for(const a of allocations){const source=sourceMap.get(`${a.sourceType}:${a.sourceId}`)!;await c.execute('INSERT INTO group_settlement_allocations(id,settlement_id,payer_id,source_type,source_id,session_id,order_id,amount,created_at) VALUES(?,?,?,?,?,?,?,?,NOW(3))',[id('ALLOC'),settlementId,payerIds[a.payerIndex],a.sourceType,a.sourceId,source.sessionId,source.orderId||null,a.amount]);}
 const touchedOrders=[...new Set(allocations.filter(a=>a.sourceType==='FOOD_ORDER_ITEM').map(a=>sourceMap.get(`FOOD_ORDER_ITEM:${a.sourceId}`)?.orderId).filter((v):v is string=>Boolean(v)))];
 for(const orderId of touchedOrders){const [orderRows]=await c.query<RowDataPacket[]>('SELECT id,payment_status,total FROM orders WHERE id=? FOR UPDATE',[orderId]);if(!orderRows[0]||orderRows[0].payment_status==='PAID')continue;const[itemRows]=await c.query<RowDataPacket[]>('SELECT oi.id,oi.qty,oi.unit_price FROM order_items oi WHERE oi.order_id=?',[orderId]);let fullyAllocated=true;for(const item of itemRows){const[sumRows]=await c.query<RowDataPacket[]>('SELECT COALESCE(SUM(amount),0) total FROM group_settlement_allocations WHERE source_type=\'FOOD_ORDER_ITEM\' AND source_id=?',[item.id]);if(Number(sumRows[0]?.total||0)<Number(item.qty)*Number(item.unit_price)){fullyAllocated=false;break;}}if(fullyAllocated)await c.execute("UPDATE orders SET payment_status='PAID',paid_at=NOW(3) WHERE id=? AND payment_status IN ('UNPAID','FAILED')",[orderId]);}
 const orderAmounts=new Map<string,number>();for(const a of allocations){if(a.sourceType!=='FOOD_ORDER_ITEM')continue;const orderId=sourceMap.get(`FOOD_ORDER_ITEM:${a.sourceId}`)?.orderId;if(orderId)orderAmounts.set(orderId,(orderAmounts.get(orderId)||0)+a.amount);}for(const [orderId,amount] of orderAmounts){if(amount<=0)continue;await c.execute('INSERT INTO payment_transactions(id,order_id,provider,status,amount,currency,created_at,updated_at,captured_at) VALUES(?,?,?,?,?,?,?,?,NOW(3))',[id('PAY'),orderId,'COUNTER','CAPTURED',amount,'INR',new Date(),new Date()]);}
 await c.execute('INSERT INTO finance_transactions(id,type,category,description,amount,method,source_type,source_id,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,NOW(3))',[id('FIN'),'REVENUE','GROUP_SETTLEMENT',`Group ${input.groupId} settlement`,total,input.method,'GROUP_SETTLEMENT',settlementId,input.staffId]);
 return{settlementId,groupId:input.groupId,amount:total,method:input.method,payers:payers.map((p,i)=>({...p,id:payerIds[i]})),allocations};
 });}
