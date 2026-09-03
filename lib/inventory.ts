import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {pool,transaction} from './mysql';

export type InventoryItem={itemId:string;name:string;category:string;onHand:number;reserved:number;available:number;reorderLevel:number;unit:string;lowStock:boolean;updatedAt:string};
const id=(p:string)=>`${p}-${randomUUID()}`;

export async function listInventory():Promise<InventoryItem[]>{
  const [rows]=await pool.query<(RowDataPacket&{item_id:string;name:string;category:string;on_hand:number;reserved:number;reorder_level:number;unit:string;updated_at:string})[]>('SELECT i.item_id,m.name,m.category,i.on_hand,i.reserved,i.reorder_level,i.unit,i.updated_at FROM inventory_items i JOIN menu_items m ON m.id=i.item_id WHERE m.active=TRUE ORDER BY m.category,m.name');
  return rows.map(r=>({itemId:r.item_id,name:r.name,category:r.category,onHand:Number(r.on_hand),reserved:Number(r.reserved),available:Number(r.on_hand)-Number(r.reserved),reorderLevel:Number(r.reorder_level),unit:r.unit,lowStock:Number(r.on_hand)-Number(r.reserved)<=Number(r.reorder_level),updatedAt:new Date(r.updated_at).toISOString()}));
}

async function movement(c:PoolConnection,itemId:string,type:string,qty:number,staffId?:string,orderId?:string,note?:string){await c.execute('INSERT INTO inventory_movements(id,item_id,type,qty,order_id,note,created_by,created_at) VALUES(?,?,?,?,?,?,?,NOW(3))',[id('MOV'),itemId,type,qty,orderId||null,note||null,staffId||null]);}

export async function ensureInventoryRows(){
  await pool.execute("INSERT INTO inventory_items(item_id,on_hand,reserved,reorder_level,unit,updated_at) SELECT id,0,0,0,'unit',NOW(3) FROM menu_items m WHERE NOT EXISTS(SELECT 1 FROM inventory_items i WHERE i.item_id=m.id)");
}

export async function receiveStock(itemId:string,qty:number,staffId:string,note?:string){return adjustStock(itemId,qty,'RECEIVE',staffId,note);}
export async function adjustStock(itemId:string,delta:number,type:'ADJUST'|'WASTE',staffId:string,note?:string){
  if(!Number.isInteger(delta)||delta===0)throw Error('Invalid stock quantity');
  return transaction(async(c:PoolConnection)=>{
    const [rows]=await c.query<RowDataPacket[]>('SELECT on_hand,reserved FROM inventory_items WHERE item_id=? FOR UPDATE',[itemId]);
    if(!rows[0])throw Error('Inventory item not found');
    const next=Number(rows[0].on_hand)+delta;if(next<Number(rows[0].reserved))throw Error('Stock cannot fall below reserved quantity');
    await c.execute('UPDATE inventory_items SET on_hand=?,updated_at=NOW(3) WHERE item_id=?',[next,itemId]);
    await movement(c,itemId,type,delta,staffId,undefined,note);return true;
  });
}

export async function setInventorySettings(itemId:string,reorderLevel:number,unit:string,staffId:string){
  if(!Number.isInteger(reorderLevel)||reorderLevel<0||!unit.trim())throw Error('Invalid inventory settings');
  await pool.execute('UPDATE inventory_items SET reorder_level=?,unit=?,updated_at=NOW(3) WHERE item_id=?',[reorderLevel,unit.trim().slice(0,40),itemId]);
  await pool.execute('INSERT INTO audit_log(staff_id,action,entity_type,entity_id,details,created_at) VALUES(?,?,?,?,?,NOW(3))',[staffId,'INVENTORY_SETTINGS_UPDATED','menu_item',itemId,JSON.stringify({reorderLevel,unit}),new Date()]);
}

export async function reserveOrderStock(c:PoolConnection,orderId:string,items:{itemId:string;qty:number}[],staffId?:string){
  const ids=[...new Set(items.map(i=>i.itemId))];
  const p=ids.map(()=>'?').join(',');
  const [rows]=await c.query<RowDataPacket[]>(`SELECT item_id,on_hand,reserved FROM inventory_items WHERE item_id IN (${p}) FOR UPDATE`,ids);
  if(rows.length!==ids.length)throw Error('Inventory not configured for menu item');
  const byId=new Map(rows.map(r=>[String(r.item_id),r]));
  for(const item of items){const r=byId.get(item.itemId);if(!r||Number(r.on_hand)-Number(r.reserved)<item.qty)throw Error(`OUT_OF_STOCK:${item.itemId}`);}
  for(const item of items){await c.execute("INSERT INTO inventory_reservations(id,order_id,item_id,qty,status,created_at,updated_at) VALUES(?,?,?,?, 'RESERVED',NOW(3),NOW(3))",[id('RES'),orderId,item.itemId,item.qty]);await c.execute('UPDATE inventory_items SET reserved=reserved+?,updated_at=NOW(3) WHERE item_id=?',[item.qty,item.itemId]);await movement(c,item.itemId,'RESERVE',item.qty,staffId,orderId,'Order reservation');}
}

export async function consumeOrderStock(c:PoolConnection,orderId:string,staffId?:string){
  const [rows]=await c.query<RowDataPacket[]>('SELECT id,item_id,qty FROM inventory_reservations WHERE order_id=? AND status=\'RESERVED\' FOR UPDATE',[orderId]);
  for(const r of rows){await c.execute('UPDATE inventory_items SET reserved=reserved-?,on_hand=on_hand-?,updated_at=NOW(3) WHERE item_id=? AND reserved>=? AND on_hand>=?',[r.qty,r.qty,r.item_id,r.qty,r.qty]);await c.execute("UPDATE inventory_reservations SET status='CONSUMED',updated_at=NOW(3) WHERE id=?",[r.id]);await movement(c,String(r.item_id),'CONSUME',-Number(r.qty),staffId,orderId,'Delivered order');}
}

export async function releaseOrderStock(c:PoolConnection,orderId:string,staffId?:string){
  const [rows]=await c.query<RowDataPacket[]>('SELECT id,item_id,qty FROM inventory_reservations WHERE order_id=? AND status=\'RESERVED\' FOR UPDATE',[orderId]);
  for(const r of rows){await c.execute('UPDATE inventory_items SET reserved=reserved-?,updated_at=NOW(3) WHERE item_id=? AND reserved>=?',[r.qty,r.item_id,r.qty]);await c.execute("UPDATE inventory_reservations SET status='RELEASED',updated_at=NOW(3) WHERE id=?",[r.id]);await movement(c,String(r.item_id),'RELEASE',-Number(r.qty),staffId,orderId,'Cancelled order');}
}
