import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {pool,transaction} from './mysql';

const id=(p:string)=>`${p}-${randomUUID()}`;
const n=(v:unknown)=>Number(v||0);
const positive=(v:unknown)=>{const x=Number(v);if(!Number.isFinite(x)||x<=0)return null;return x};

export type InventoryMaterial={id:string;name:string;category:string;unit:string;onHand:number;reserved:number;available:number;reorderLevel:number;lowStock:boolean;active:boolean};

export async function listInventoryMaterials(){
 const[rows]=await pool.query<RowDataPacket[]>(`SELECT m.id,m.name,m.category,m.unit,m.active,COALESCE(s.on_hand,0) on_hand,COALESCE(s.reserved,0) reserved,COALESCE(s.reorder_level,m.reorder_level) reorder_level FROM inventory_materials m LEFT JOIN inventory_material_stock s ON s.material_id=m.id ORDER BY m.category,m.name`);
 return rows.map(r=>({id:String(r.id),name:String(r.name),category:String(r.category),unit:String(r.unit),onHand:n(r.on_hand),reserved:n(r.reserved),available:n(r.on_hand)-n(r.reserved),reorderLevel:n(r.reorder_level),lowStock:n(r.on_hand)-n(r.reserved)<=n(r.reorder_level),active:Boolean(r.active)}));
}

export async function upsertMaterial(x:{id?:string;name:string;category?:string;unit?:string;reorderLevel?:number;staffId:string}){
 const name=x.name.trim().slice(0,160);const category=(x.category||'GENERAL').trim().slice(0,100);const unit=(x.unit||'unit').trim().slice(0,40);const reorder=Number(x.reorderLevel??0);
 if(!name||!unit||!Number.isSafeInteger(reorder)||reorder<0)throw Error('INVALID_MATERIAL');
 return transaction(async(c)=>{
  const materialId=x.id?.trim()||id('MAT');
  await c.execute(`INSERT INTO inventory_materials(id,name,category,unit,reorder_level,active,created_at,updated_at) VALUES(?,?,?,?,?,TRUE,NOW(3),NOW(3)) ON DUPLICATE KEY UPDATE name=VALUES(name),category=VALUES(category),unit=VALUES(unit),reorder_level=VALUES(reorder_level),updated_at=NOW(3)`,[materialId,name,category,unit,reorder]);
  await c.execute(`INSERT INTO inventory_material_stock(material_id,on_hand,reserved,reorder_level,updated_at) VALUES(?,0,0,?,NOW(3)) ON DUPLICATE KEY UPDATE reorder_level=VALUES(reorder_level),updated_at=NOW(3)`,[materialId,reorder]);
  await c.execute('INSERT INTO audit_log(staff_id,action,entity_type,entity_id,details,created_at) VALUES(?,?,?,?,?,NOW(3))',[x.staffId,'INVENTORY_MATERIAL_UPSERT','inventory_material',materialId,JSON.stringify({name,category,unit,reorderLevel:reorder})]);
  return materialId;
 });
}

export async function setMaterialActive(materialId:string,active:boolean,staffId:string){await pool.execute('UPDATE inventory_materials SET active=?,updated_at=NOW(3) WHERE id=?',[active,materialId]);await pool.execute('INSERT INTO audit_log(staff_id,action,entity_type,entity_id,details,created_at) VALUES(?,?,?,?,?,NOW(3))',[staffId,'INVENTORY_MATERIAL_STATUS','inventory_material',materialId,JSON.stringify({active})]);}

export async function setRecipe(menuItemId:string,components:{materialId:string;qtyPerItem:number}[],staffId:string){
 if(!menuItemId||!components.length)throw Error('RECIPE_REQUIRES_COMPONENTS');
 return transaction(async(c)=>{
  const[m]=await c.query<RowDataPacket[]>('SELECT id FROM menu_items WHERE id=? LIMIT 1',[menuItemId]);if(!m[0])throw Error('MENU_ITEM_NOT_FOUND');
  const dedup=new Set<string>();
  for(const x of components){const q=positive(x.qtyPerItem);if(!q||dedup.has(x.materialId))throw Error('INVALID_RECIPE');dedup.add(x.materialId);}
  const ids=components.map(x=>x.materialId),ph=ids.map(()=>'?').join(',');const[ms]=await c.query<RowDataPacket[]>(`SELECT id FROM inventory_materials WHERE id IN (${ph}) AND active=TRUE`,ids);if(ms.length!==ids.length)throw Error('RECIPE_MATERIAL_NOT_FOUND');
  await c.execute('DELETE FROM menu_item_recipes WHERE menu_item_id=?',[menuItemId]);
  for(const x of components)await c.execute('INSERT INTO menu_item_recipes(id,menu_item_id,material_id,qty_per_item,created_at,updated_at) VALUES(?,?,?,?,NOW(3),NOW(3))',[id('REC'),menuItemId,x.materialId,x.qtyPerItem]);
  await c.execute('INSERT INTO audit_log(staff_id,action,entity_type,entity_id,details,created_at) VALUES(?,?,?,?,?,NOW(3))',[staffId,'INVENTORY_RECIPE_UPDATED','menu_item',menuItemId,JSON.stringify({components})]);
 });
}

export async function getRecipe(menuItemId:string){const[rows]=await pool.query<RowDataPacket[]>('SELECT r.material_id,m.name,m.unit,r.qty_per_item FROM menu_item_recipes r JOIN inventory_materials m ON m.id=r.material_id WHERE r.menu_item_id=? ORDER BY m.name',[menuItemId]);return rows.map(r=>({materialId:String(r.material_id),name:String(r.name),unit:String(r.unit),qtyPerItem:n(r.qty_per_item)}));}

async function ensureStockRow(c:PoolConnection,materialId:string){await c.execute(`INSERT INTO inventory_material_stock(material_id,on_hand,reserved,reorder_level,updated_at) SELECT id,0,0,reorder_level,NOW(3) FROM inventory_materials WHERE id=? AND NOT EXISTS(SELECT 1 FROM inventory_material_stock WHERE material_id=?)`,[materialId,materialId]);}

export async function receiveMaterial(x:{materialId:string;qty:number;unitCost:number;supplier?:string;batchNumber?:string;expiryAt?:string;staffId:string;note?:string}){
 const qty=positive(x.qty),cost=Number(x.unitCost);if(!qty||!Number.isSafeInteger(cost)||cost<0)throw Error('INVALID_RECEIPT');
 return transaction(async(c)=>{await ensureStockRow(c,x.materialId);const[r]=await c.query<RowDataPacket[]>('SELECT id FROM inventory_materials WHERE id=? AND active=TRUE FOR UPDATE',[x.materialId]);if(!r[0])throw Error('MATERIAL_NOT_FOUND');const batchId=id('BATCH');await c.execute('INSERT INTO inventory_batches(id,material_id,received_qty,remaining_qty,unit_cost,supplier,batch_number,received_at,expiry_at,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,NOW(3))',[batchId,x.materialId,qty,qty,cost,x.supplier?.trim().slice(0,160)||null,x.batchNumber?.trim().slice(0,100)||null,new Date(),x.expiryAt||null,x.staffId]);await c.execute('UPDATE inventory_material_stock SET on_hand=on_hand+?,updated_at=NOW(3) WHERE material_id=?',[qty,x.materialId]);await c.execute('INSERT INTO inventory_material_movements(id,material_id,type,qty,batch_id,note,created_by,created_at) VALUES(?,?,?,?,?,?,?,NOW(3))',[id('MMOV'),x.materialId,'RECEIVE',qty,batchId,x.note?.trim().slice(0,255)||null,x.staffId]);return batchId;});
}

export async function listBatches(materialId?:string){const[rows]=await pool.query<RowDataPacket[]>(`SELECT b.id,b.material_id,m.name,b.received_qty,b.remaining_qty,b.unit_cost,b.supplier,b.batch_number,b.received_at,b.expiry_at FROM inventory_batches b JOIN inventory_materials m ON m.id=b.material_id ${materialId?'WHERE b.material_id=?':''} ORDER BY b.received_at DESC,b.id DESC LIMIT 500`,materialId?[materialId]:[]);return rows.map(r=>({id:String(r.id),materialId:String(r.material_id),materialName:String(r.name),receivedQty:n(r.received_qty),remainingQty:n(r.remaining_qty),unitCost:n(r.unit_cost),supplier:r.supplier?String(r.supplier):undefined,batchNumber:r.batch_number?String(r.batch_number):undefined,receivedAt:new Date(r.received_at).toISOString(),expiryAt:r.expiry_at?String(r.expiry_at).slice(0,10):undefined}));}

export async function inventoryValuation(){const[rows]=await pool.query<RowDataPacket[]>(`SELECT m.id,m.name,COALESCE(SUM(b.remaining_qty*b.unit_cost),0) value,COALESCE(SUM(b.remaining_qty),0) qty FROM inventory_materials m LEFT JOIN inventory_batches b ON b.material_id=m.id AND b.remaining_qty>0 GROUP BY m.id,m.name ORDER BY value DESC`);return rows.map(r=>({materialId:String(r.id),name:String(r.name),quantity:n(r.qty),value:n(r.value)}));}

export async function createStocktake(staffId:string,notes?:string){return transaction(async(c)=>{const sid=id('ST');await c.execute('INSERT INTO inventory_stocktakes(id,status,notes,created_by,created_at) VALUES(?,?,?, ?,NOW(3))',[sid,'OPEN',notes?.trim().slice(0,500)||null,staffId]);const[ms]=await c.query<RowDataPacket[]>('SELECT m.id,COALESCE(s.on_hand-s.reserved,0) qty FROM inventory_materials m LEFT JOIN inventory_material_stock s ON s.material_id=m.id WHERE m.active=TRUE ORDER BY m.name');for(const m of ms)await c.execute('INSERT INTO inventory_stocktake_lines(id,stocktake_id,material_id,system_qty) VALUES(?,?,?,?)',[id('STL'),sid,m.id,n(m.qty)]);return sid;});}

export async function completeStocktake(stocktakeId:string,lines:{materialId:string;countedQty:number;note?:string}[],staffId:string){return transaction(async(c)=>{const[h]=await c.query<RowDataPacket[]>('SELECT id,status FROM inventory_stocktakes WHERE id=? FOR UPDATE',[stocktakeId]);if(!h[0]||h[0].status!=='OPEN')throw Error('STOCKTAKE_NOT_OPEN');for(const x of lines){if(!Number.isFinite(Number(x.countedQty))||Number(x.countedQty)<0)throw Error('INVALID_STOCKTAKE_COUNT');const[l]=await c.query<RowDataPacket[]>('SELECT id,system_qty FROM inventory_stocktake_lines WHERE stocktake_id=? AND material_id=? FOR UPDATE',[stocktakeId,x.materialId]);if(!l[0])throw Error('STOCKTAKE_MATERIAL_NOT_FOUND');const counted=Number(x.countedQty),variance=counted-n(l[0].system_qty);await c.execute('UPDATE inventory_stocktake_lines SET counted_qty=?,variance_qty=?,note=? WHERE id=?',[counted,variance,x.note?.trim().slice(0,255)||null,l[0].id]);if(variance!==0){await c.execute('UPDATE inventory_material_stock SET on_hand=on_hand+?,updated_at=NOW(3) WHERE material_id=? AND on_hand+?>=reserved',[variance,x.materialId,variance]);await c.execute('INSERT INTO inventory_material_movements(id,material_id,type,qty,order_id,note,created_by,created_at) VALUES(?,?,?,?,?,?,?,NOW(3))',[id('MMOV'),x.materialId,'STOCKTAKE',variance,null,`Stocktake ${stocktakeId}`,staffId]);}}
 await c.execute("UPDATE inventory_stocktakes SET status='COMPLETED',completed_by=?,completed_at=NOW(3) WHERE id=?",[staffId,stocktakeId]);await c.execute('INSERT INTO audit_log(staff_id,action,entity_type,entity_id,details,created_at) VALUES(?,?,?,?,?,NOW(3))',[staffId,'INVENTORY_STOCKTAKE_COMPLETED','stocktake',stocktakeId,JSON.stringify({lines:lines.length})]);return true;});}

export async function listStocktakes(){const[rows]=await pool.query<RowDataPacket[]>('SELECT id,status,notes,created_by,created_at,completed_by,completed_at FROM inventory_stocktakes ORDER BY created_at DESC LIMIT 100');return rows.map(r=>({id:String(r.id),status:String(r.status),notes:r.notes?String(r.notes):undefined,createdBy:r.created_by?String(r.created_by):undefined,createdAt:new Date(r.created_at).toISOString(),completedBy:r.completed_by?String(r.completed_by):undefined,completedAt:r.completed_at?new Date(r.completed_at).toISOString():undefined}));}

export async function listWasteReasons(){const[rows]=await pool.query<RowDataPacket[]>('SELECT id,name FROM inventory_waste_reasons WHERE active=TRUE ORDER BY name');return rows.map(r=>({id:String(r.id),name:String(r.name)}));}

export async function wasteMaterial(x:{materialId:string;qty:number;reasonId:string;staffId:string;note?:string}){const qty=positive(x.qty);if(!qty)throw Error('INVALID_WASTE_QTY');return transaction(async(c)=>{const[r]=await c.query<RowDataPacket[]>('SELECT on_hand,reserved FROM inventory_material_stock WHERE material_id=? FOR UPDATE',[x.materialId]);if(!r[0]||n(r[0].on_hand)-n(r[0].reserved)<qty)throw Error('INSUFFICIENT_AVAILABLE_STOCK');await c.execute('UPDATE inventory_material_stock SET on_hand=on_hand-?,updated_at=NOW(3) WHERE material_id=?',[qty,x.materialId]);await c.execute('INSERT INTO inventory_material_movements(id,material_id,type,qty,waste_reason_id,note,created_by,created_at) VALUES(?,?,?,?,?,?,?,NOW(3))',[id('MMOV'),x.materialId,'WASTE',-qty,x.reasonId,x.note?.trim().slice(0,255)||null,x.staffId]);return true;});}
