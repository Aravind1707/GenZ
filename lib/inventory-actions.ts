import {randomUUID} from 'node:crypto';
import type {RowDataPacket} from 'mysql2/promise';
import {transaction} from './mysql';

const id=(prefix:string)=>`${prefix}-${randomUUID()}`;

export async function adjustMaterialStock(materialId:string,delta:number,type:'ADJUST'|'WASTE',staffId:string,note?:string){
  if(!Number.isFinite(delta)||delta===0)throw Error('INVALID_STOCK_QUANTITY');
  return transaction(async c=>{
    const[rows]=await c.query<RowDataPacket[]>('SELECT on_hand,reserved FROM inventory_material_stock WHERE material_id=? FOR UPDATE',[materialId]);
    if(!rows[0])throw Error('MATERIAL_STOCK_NOT_CONFIGURED');
    const onHand=Number(rows[0].on_hand),reserved=Number(rows[0].reserved),next=onHand+delta;
    if(next<0||next<reserved)throw Error('STOCK_CANNOT_BE_NEGATIVE_OR_BELOW_RESERVED');
    await c.execute('UPDATE inventory_material_stock SET on_hand=?,updated_at=NOW(3) WHERE material_id=?',[next,materialId]);
    await c.execute('INSERT INTO inventory_material_movements(id,material_id,type,qty,note,created_by,created_at) VALUES(?,?,?,?,?,?,NOW(3))',[id('MMOV'),materialId,type,delta,note?.trim().slice(0,255)||null,staffId]);
    await c.execute('INSERT INTO audit_log(staff_id,action,entity_type,entity_id,details,created_at) VALUES(?,?,?,?,?,NOW(3))',[staffId,type==='WASTE'?'INVENTORY_WASTED':'INVENTORY_ADJUSTED','inventory_material',materialId,JSON.stringify({delta,note})]);
    return next;
  });
}

export async function setMaterialSettings(materialId:string,reorderLevel:number,unit:string,staffId:string){
  if(!Number.isSafeInteger(reorderLevel)||reorderLevel<0||!unit.trim())throw Error('INVALID_INVENTORY_SETTINGS');
  return transaction(async c=>{
    const[r]=await c.query<RowDataPacket[]>('SELECT id FROM inventory_materials WHERE id=? FOR UPDATE',[materialId]);
    if(!r[0])throw Error('MATERIAL_NOT_FOUND');
    const normalized=unit.trim().slice(0,40);
    await c.execute('UPDATE inventory_materials SET unit=?,reorder_level=?,updated_at=NOW(3) WHERE id=?',[normalized,reorderLevel,materialId]);
    await c.execute('UPDATE inventory_material_stock SET reorder_level=?,updated_at=NOW(3) WHERE material_id=?',[reorderLevel,materialId]);
    await c.execute('INSERT INTO audit_log(staff_id,action,entity_type,entity_id,details,created_at) VALUES(?,?,?,?,?,NOW(3))',[staffId,'INVENTORY_SETTINGS_UPDATED','inventory_material',materialId,JSON.stringify({reorderLevel,unit:normalized})]);
  });
}
