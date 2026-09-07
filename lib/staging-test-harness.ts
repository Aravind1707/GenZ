import { randomUUID } from 'node:crypto';
import { pool, transaction } from './mysql';
import { startSession, advanceOrder } from './store';
import { addParticipant, calculateSessionBilling } from './gaming-billing';
import { endSessionForSettlement } from './session-lifecycle';
import { settleSession } from './session-settlement';
import { createFoodOrder, markCounterPaid, cancelFoodOrder, refundFoodOrder, deliverFoodOrder } from './food-orders';

export type StagingTestResult = { key: string; name: string; status: 'PASS' | 'FAIL'; message: string; details?: unknown };
export type StagingSuiteResult = { ok: boolean; environment: string; runId: string; results: StagingTestResult[]; failed: number; passed: number; reset: boolean };
const PREFIX = 'STGTEST-';
const id = (p: string) => `${PREFIX}${p}-${randomUUID()}`;
const stagingOnly = () => (process.env.GENZ_DEPLOYMENT_MODE || 'production') === 'staging';
const assertStaging = () => { if (!stagingOnly()) throw new Error('STAGING_ONLY: destructive developer tests are disabled outside staging'); };
const record = async (results: StagingTestResult[], key: string, name: string, fn: () => Promise<unknown>) => { try { results.push({ key, name, status: 'PASS', message: 'Passed', details: await fn() }); } catch (error) { results.push({ key, name, status: 'FAIL', message: error instanceof Error ? error.message : String(error) }); } };

export async function resetStagingTestData() {
  assertStaging();
  const like = `${PREFIX}%`;
  return transaction(async c => {
    await c.execute('DELETE FROM station_agent_commands WHERE idempotency_key LIKE ?', [like]);
    const tables = [
      ['audit_log', 'entity_id'], ['session_payment_refunds', 'session_id'], ['group_settlement_allocations', 'session_id'],
      ['group_settlement_payers', 'settlement_id'], ['group_settlements', 'group_id'], ['booking_deposit_applications', 'session_id'],
      ['customer_credit_entries', 'source_id'], ['billing_adjustments', 'session_id'], ['session_settlements', 'session_id'],
      ['payment_transactions', 'order_id'], ['food_order_refunds', 'order_id'], ['inventory_cogs_ledger', 'order_id'],
      ['inventory_material_movements', 'order_id'], ['inventory_reservations', 'order_id'], ['order_items', 'order_id'],
      ['orders', 'id'], ['session_participants', 'session_id'], ['session_pause_periods', 'session_id'], ['sessions', 'id'],
    ] as const;
    for (const [table, column] of tables) await c.execute(`DELETE FROM ${table} WHERE ${column} LIKE ?`, [like]);
    await c.execute('DELETE FROM inventory_batches WHERE id LIKE ?', [like]);
    await c.execute('DELETE FROM inventory_material_stock WHERE material_id LIKE ?', [like]);
    await c.execute('DELETE FROM menu_item_recipes WHERE id LIKE ?', [like]);
    await c.execute('DELETE FROM inventory_materials WHERE id LIKE ?', [like]);
    await c.execute('DELETE FROM menu_items WHERE id LIKE ?', [like]);
    await c.execute('DELETE FROM customers WHERE id LIKE ?', [like]);
    await c.execute('DELETE FROM members WHERE id LIKE ?', [like]);
    return true;
  });
}

async function seedDemo(staffId: string) {
  const memberId = id('MEM'), customerId = id('CUS'), menuId = id('MENU'), materialId = id('MAT'), batchId = id('BAT'), now = new Date();
  await transaction(async c => {
    await c.execute('INSERT INTO members(id,name,mobile,government_id_type,government_id_number,expires_at,active,created_at,updated_at) VALUES(?,?,?,?,?,NULL,TRUE,?,?)', [memberId, 'Staging Test Member', `999${String(Date.now()).slice(-7)}`, 'Other', memberId, now, now]);
    await c.execute('INSERT INTO customers(id,mobile,name,member_id,created_at,updated_at) VALUES(?,?,?,?,?,?)', [customerId, `888${String(Date.now()).slice(-7)}`, 'Staging Test Customer', memberId, now, now]);
    await c.execute('INSERT INTO menu_items(id,name,category,member_price,non_member_price,stock_qty,active,created_at,updated_at) VALUES(?,?,?,?,?,?,TRUE,?,?)', [menuId, 'Staging Test Burger', 'TEST', 10, 12, 1, now, now]);
    await c.execute('INSERT INTO inventory_materials(id,name,category,unit,reorder_level,active,created_at,updated_at) VALUES(?,?,?,?,0,TRUE,?,?)', [materialId, 'Staging Test Patty', 'TEST', 'unit', now, now]);
    await c.execute('INSERT INTO menu_item_recipes(id,menu_item_id,material_id,qty_per_item,created_at,updated_at) VALUES(?,?,?,?,?,?)', [id('RECIPE'), menuId, materialId, 1, now, now]);
    await c.execute('INSERT INTO inventory_material_stock(material_id,on_hand,reserved,reorder_level,updated_at) VALUES(?,?,?,0,?)', [materialId, 10, 0, now]);
    await c.execute('INSERT INTO inventory_batches(id,material_id,received_qty,remaining_qty,unit_cost,supplier,batch_number,received_at,expiry_at,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,NULL,?,?)', [batchId, materialId, 10, 10, 5, 'Staging Test Supplier', batchId, now, staffId, now]);
  });
  const [stations] = await pool.query('SELECT id FROM stations WHERE status=\'AVAILABLE\' ORDER BY id LIMIT 1');
  const station = (stations as Array<{ id: string }>)[0];
  if (!station) throw new Error('No available station for staging suite');
  return { memberId, customerId, menuId, materialId, batchId, stationId: station.id };
}

async function assertCounts(orderId: string, materialId: string) {
  const [[stock]] = await pool.query('SELECT on_hand,reserved FROM inventory_material_stock WHERE material_id=?', [materialId]) as any;
  const [[reservation]] = await pool.query('SELECT COUNT(*) count FROM inventory_reservations WHERE order_id=? AND status=\'CONSUMED\'', [orderId]) as any;
  const [[cogs]] = await pool.query('SELECT COALESCE(SUM(qty),0) qty,COALESCE(SUM(total_cost),0) cost FROM inventory_cogs_ledger WHERE order_id=?', [orderId]) as any;
  if (!stock || Number(stock.on_hand) !== 9 || Number(stock.reserved) !== 0) throw new Error(`Inventory lifecycle mismatch: on_hand=${stock?.on_hand} reserved=${stock?.reserved}`);
  if (Number(reservation.count) !== 1 || Number(cogs.qty) !== 1 || Number(cogs.cost) !== 5) throw new Error('Inventory reservation/COGS lifecycle mismatch');
  return { stock, reservation, cogs };
}

export async function runStagingDestructiveSuite(options: { keepData?: boolean } = {}): Promise<StagingSuiteResult> {
  assertStaging();
  const runId = id('RUN'), results: StagingTestResult[] = [];
  const [staffRows] = await pool.query('SELECT id FROM staff_users WHERE role=\'DEVELOPER\' AND active=TRUE ORDER BY created_at LIMIT 1');
  const staff = (staffRows as Array<{ id: string }>)[0];
  if (!staff) throw new Error('An active Developer staff account is required for the staging suite');
  await resetStagingTestData();
  const demo = await seedDemo(staff.id);
  let sessionId = '';
  try {
    await record(results, 'customer', 'Create isolated member/customer', async () => {
      const [[member]] = await pool.query('SELECT id,active,expires_at FROM members WHERE id=?', [demo.memberId]) as any;
      const [[customer]] = await pool.query('SELECT id,member_id FROM customers WHERE id=?', [demo.customerId]) as any;
      if (!member || Number(member.active) !== 1 || member.expires_at !== null || !customer || customer.member_id !== demo.memberId) throw new Error('Demo identity was not created correctly');
      return { memberId: demo.memberId, customerId: demo.customerId };
    });
    await record(results, 'session', 'Customer → session lifecycle', async () => {
      const session = await startSession({ stationId: demo.stationId, customerName: 'Staging Test Customer', memberId: demo.memberId });
      sessionId = session.id;
      await addParticipant({ sessionId, customerId: demo.customerId }, staff.id);
      const billing = await calculateSessionBilling(sessionId);
      if (billing.participants.length !== 1) throw new Error('Session participant was not attached');
      await endSessionForSettlement(sessionId);
      const [[ended]] = await pool.query('SELECT status,settlement_status FROM sessions WHERE id=?', [sessionId]) as any;
      if (!ended || ended.status !== 'ENDED') throw new Error('Session did not end');
      return { sessionId, gamingTotal: billing.gamingTotal, state: ended };
    });
    await record(results, 'settlement', 'Session → settlement lifecycle + replay', async () => {
      const [[row]] = await pool.query('SELECT gaming_balance FROM sessions WHERE id=?', [sessionId]) as any;
      const amount = Number(row.gaming_balance);
      if (amount <= 0) throw new Error('Gaming balance was not finalized');
      const key = `${runId}-SETTLE`;
      const first = await settleSession({ sessionId, amount, method: 'CASH', staffId: staff.id, idempotencyKey: key });
      const replay = await settleSession({ sessionId, amount, method: 'CASH', staffId: staff.id, idempotencyKey: key });
      if (!replay.existing || replay.settlementId !== first.settlementId) throw new Error('Settlement idempotency replay failed');
      return { amount, settlementId: first.settlementId, replayExisting: replay.existing };
    });
    await record(results, 'order', 'Food order → kitchen → delivery → inventory/COGS + replay', async () => {
      const session = await startSession({ stationId: demo.stationId, customerName: 'Staging Test Customer', memberId: demo.memberId });
      sessionId = session.id;
      await addParticipant({ sessionId, customerId: demo.customerId });
      const order = await createFoodOrder({ sessionId, customerId: demo.customerId, items: [{ itemId: demo.menuId, qty: 1 }], paymentMode: 'COUNTER', idempotencyKey: `${runId}-ORDER` });
      const replay = await createFoodOrder({ sessionId, customerId: demo.customerId, items: [{ itemId: demo.menuId, qty: 1 }], paymentMode: 'COUNTER', idempotencyKey: `${runId}-ORDER` });
      if (!replay.existing || replay.id !== order.id) throw new Error('Food order idempotency replay failed');
      await markCounterPaid(order.id);
      await advanceOrder(order.id); await advanceOrder(order.id); await advanceOrder(order.id); await advanceOrder(order.id);
      await deliverFoodOrder(order.id, staff.id);
      return { orderId: order.id, total: order.total, inventory: await assertCounts(order.id, demo.materialId) };
    });
    await record(results, 'cancel-refund', 'Paid order cancellation → refund + reservation release', async () => {
      const [[before]] = await pool.query('SELECT on_hand,reserved FROM inventory_material_stock WHERE material_id=?', [demo.materialId]) as any;
      const order = await createFoodOrder({ sessionId, customerId: demo.customerId, items: [{ itemId: demo.menuId, qty: 1 }], paymentMode: 'COUNTER', idempotencyKey: `${runId}-CANCEL` });
      await markCounterPaid(order.id);
      const cancelled = await cancelFoodOrder(order.id, staff.id);
      if (!cancelled.cancelled || !cancelled.refund) throw new Error('Paid cancellation did not create refund eligibility');
      const [[released]] = await pool.query('SELECT reserved FROM inventory_material_stock WHERE material_id=?', [demo.materialId]) as any;
      if (Number(released.reserved) !== Number(before.reserved)) throw new Error('Cancellation did not release reserved stock');
      const refund = await refundFoodOrder(order.id, staff.id);
      if (refund.amount !== order.total) throw new Error('Refund amount did not match order total');
      return { orderId: order.id, refundId: refund.refundId, amount: refund.amount };
    });
    await record(results, 'concurrency', 'Concurrent station/session protection', async () => {
      await endSessionForSettlement(sessionId).catch(() => undefined);
      const attempts = await Promise.allSettled([1, 2].map(() => startSession({ stationId: demo.stationId, customerName: 'Concurrency Test', memberId: demo.memberId })));
      const successes = attempts.filter(x => x.status === 'fulfilled'), failures = attempts.filter(x => x.status === 'rejected');
      if (successes.length !== 1 || failures.length !== 1) throw new Error(`Expected exactly one concurrent session success; got ${successes.length} successes/${failures.length} failures`);
      await endSessionForSettlement((successes[0] as PromiseFulfilledResult<{ id: string }>).value.id);
      return { successes: successes.length, failures: failures.length };
    });
    await record(results, 'station-agent', 'Station-agent command idempotency', async () => {
      const commandId = randomUUID(), key = `${runId}-AGENT`;
      await pool.execute('INSERT INTO station_agent_commands(id,station_id,session_id,type,payload_json,status,idempotency_key,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)', [commandId, demo.stationId, null, 'LOCK_STATION', JSON.stringify({ reason: 'staging-suite' }), 'PENDING', key, new Date(), new Date(Date.now() + 60000)]);
      let duplicateRejected = false;
      try { await pool.execute('INSERT INTO station_agent_commands(id,station_id,session_id,type,payload_json,status,idempotency_key,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)', [randomUUID(), demo.stationId, null, 'LOCK_STATION', JSON.stringify({ reason: 'staging-suite-duplicate' }), 'PENDING', key, new Date(), new Date(Date.now() + 60000)]); } catch { duplicateRejected = true; }
      if (!duplicateRejected) throw new Error('Station-agent idempotency key was not enforced');
      return { commandId, duplicateRejected };
    });
  } finally {
    if (!options.keepData) await resetStagingTestData();
  }
  const failed = results.filter(r => r.status === 'FAIL').length;
  return { ok: failed === 0, environment: process.env.GENZ_DEPLOYMENT_MODE || 'production', runId, results, failed, passed: results.length - failed, reset: !options.keepData };
}

export { assertStaging, stagingOnly };
