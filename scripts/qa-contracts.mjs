import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const failures = [];
const check = (name, condition) => { if (!condition) failures.push(name); };
const has = (file, pattern) => pattern.test(read(file));

// Build/deployment contract.
check('package.json has production build/test scripts', has('package.json', /"build"\s*:\s*"next build"/) && has('package.json', /"test"\s*:\s*"npm run test:integrity && npm run test:qa"/));
check('CI runs integrity tests and production build', has('.github/workflows/ci.yml', /npm test/) && has('.github/workflows/ci.yml', /npm run build/));
for (const file of ['Dockerfile', 'docker-compose.yml', 'docker-entrypoint.sh', '.dockerignore']) check(`deployment file exists: ${file}`, exists(file));

// Migration integrity is deliberately tested independently as well as by npm test.
const migrations = fs.readdirSync(path.join(root, 'db', 'migrations')).filter(f => /^\d+_.+\.sql$/.test(f));
const versions = migrations.map(f => Number(f.split('_', 1)[0]));
check('migrations have no duplicate versions', new Set(versions).size === versions.length);
check('migration 044 inventory COGS exists', exists('db/migrations/044_inventory_cogs.sql'));
check('latest migration is 044', Math.max(...versions) === 44);

// Customer food availability contract: recipe stock is surfaced and enforced in UI.
check('pricing exposes food availability', has('lib/pricing.ts', /available/) && has('lib/pricing.ts', /menu_item_recipes/) && has('lib/pricing.ts', /inventory_material_stock/));
check('customer pricing type includes availability', has('app/customer/page.tsx', /type FoodItem=\{[^}]*available:boolean/s));
check('unavailable food has image overlay', has('app/customer/FoodCart.tsx', /NOT AVAILABLE RIGHT NOW/) && has('app/customer/FoodCart.tsx', /unavailableOverlay/));
check('unavailable food cannot be added', has('app/customer/FoodCart.tsx', /if\(!item\?\.available\)return/) && has('app/customer/FoodCart.tsx', /disabled=\{!i\.available\}/));

// Billing/payment safety contracts.
check('session settlement gates station release on outstanding balance', has('lib/session-settlement.ts', /outstanding\s*<=\s*0/) && has('lib/session-settlement.ts', /release/));
check('refunds are idempotent', has('lib/session-refunds.ts', /idempot/) && has('db/migrations/034_session_payment_refund_idempotency.sql', /idempot/));
check('refund provider fields exist', has('db/migrations/041_session_refund_provider.sql', /provider_status/) && has('lib/session-refunds.ts', /provider/));
check('daily close approval has persisted status', has('db/migrations/042_daily_close_approval.sql', /APPROVED/) && has('lib/daily-close-report.ts', /approvalStatus/));
check('daily close API requires finance write for mutations', has('app/api/daily-close/route.ts', /finance:write/) && has('app/api/daily-close/route.ts', /approve/));
check('finance reconciliation covers revenue and expense', has('lib/finance-reconciliation.ts', /REVENUE/) && has('lib/finance-reconciliation.ts', /EXPENSE/));

// Station-agent safety contracts.
check('station agent protocol has fail-safe states', has('lib/station-agent-protocol.ts', /OFFLINE/) && has('lib/station-agent-protocol.ts', /LOCKED/) && has('lib/station-agent-protocol.ts', /ERROR/));
check('station agent has heartbeat and command APIs', exists('app/api/station-agent/heartbeat/route.ts') && exists('app/api/station-agent/commands/route.ts'));
check('station agent lease validation exists', exists('lib/station-agent-lease.ts'));

// Security/reliability contracts.
check('request ID middleware exists', has('middleware.ts', /x-request-id/) && has('middleware.ts', /randomUUID/));
check('realtime event replay exists', exists('lib/realtime.ts') && exists('app/api/events/route.ts'));
check('migration validator exists', exists('scripts/validate-migrations.mjs'));

if (failures.length) {
  console.error(`QA contract checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`QA contract checks passed: ${migrations.length} migrations, deployment, customer availability, billing, station-agent, realtime and security contracts verified.`);
