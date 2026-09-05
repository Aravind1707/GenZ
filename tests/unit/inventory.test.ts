import test from 'node:test';
import assert from 'node:assert/strict';
function fifo(batches:{remaining:number;cost:number;expiry?:string|null}[],qty:number,today='2026-09-05'){const usable=batches.filter(b=>b.remaining>0&&(!b.expiry||b.expiry>=today));let left=qty,total=0;for(const b of usable){const take=Math.min(left,b.remaining);total+=Math.round(take*b.cost);left-=take;if(left===0)break}if(left>0)throw Error('INSUFFICIENT_BATCH_STOCK');return total}
test('FIFO COGS consumes oldest valid batch first',()=>assert.equal(fifo([{remaining:5,cost:100,expiry:'2026-12-01'},{remaining:10,cost:150,expiry:'2026-12-10'}],8),1250));
test('FIFO skips expired batches',()=>assert.equal(fifo([{remaining:5,cost:100,expiry:'2026-09-04'},{remaining:10,cost:150,expiry:'2026-12-10'}],8),1200));
test('FIFO fails instead of creating negative stock',()=>assert.throws(()=>fifo([{remaining:2,cost:100}],3),/INSUFFICIENT_BATCH_STOCK/));
test('fractional FIFO cost is deterministic',()=>assert.equal(fifo([{remaining:2.5,cost:120}],1.25),150));
test('inventory valuation ignores expired stock',()=>{const batches=[{remaining:5,cost:100,expiry:'2026-09-04'},{remaining:2,cost:200,expiry:'2026-12-01'}];const value=batches.filter(b=>!b.expiry||b.expiry>='2026-09-05').reduce((s,b)=>s+b.remaining*b.cost,0);assert.equal(value,400)});
