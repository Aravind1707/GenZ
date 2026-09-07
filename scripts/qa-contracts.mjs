import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const check = (name, condition) => { if (!condition) failures.push(name); };
const has = (file, pattern) => pattern.test(read(file));

check('package has production build and test scripts', has('package.json', /"build"\s*:\s*"next build"/) && has('package.json', /"test"\s*:\s*"npm run test:integrity && npm run test:qa && npm run test:unit"/));
check('package has unit/integration/coverage scripts', has('package.json', /"test:unit"/) && has('package.json', /"test:integration"/) && has('package.json', /"test:coverage"/) && has('package.json', /"test:razorpay"/));
check('staging destructive test script is registered', has('package.json', /"test:staging"\s*:\s*"node --import tsx scripts\/staging-destructive-test\.mjs"/) && exists('scripts/staging-destructive-test.mjs') && exists('lib/staging-test-harness.ts'));
check('browser E2E test is registered', has('package.json', /"test:e2e"\s*:\s*"playwright test"/) && exists('playwright.config.mjs') && exists('tests/e2e/staging-smoke.spec.mjs'));
check('CI has required jobs', has('.github/workflows/ci.yml', /unit-build:/) && has('.github/workflows/ci.yml', /mysql-integration:/) && has('.github/workflows/ci.yml', /docker:/) && has('.github/workflows/ci.yml', /security:/) && has('.github/workflows/ci.yml', /staging:/));

const migrations = fs.readdirSync(path.join(root, 'db', 'migrations')).filter((file) => /^\d+_.+\.sql$/.test(file));
const versions = migrations.map((file) => Number(file.split('_', 1)[0]));
check('migrations have no duplicates', new Set(versions).size === versions.length);
check('latest migration is 052', Math.max(...versions) === 52);
check('membership pricing migration exists', exists('db/migrations/049_membership_single_type_and_rates.sql'));
check('non-expiring membership migration exists', exists('db/migrations/050_membership_transactions_non_expiring.sql'));
check('equipment/station seed migration exists', exists('db/migrations/051_equipment_and_test_food.sql'));
check('developer feature migration exists', exists('db/migrations/052_developer_features_and_audit.sql'));
check('developer console and audit API exist', exists('app/(staff)/developer/page.tsx') && exists('app/api/developer/features/route.ts') && exists('lib/features.ts'));
check('developer testing center API exists and is protected', exists('app/api/developer/testing/route.ts') && has('app/api/developer/testing/route.ts', /staff\.role!==['"]DEVELOPER['"]/));
check('developer diagnostics cover database, schema and inventory', has('app/api/developer/testing/route.ts', /SELECT 1 AS ok/) && has('app/api/developer/testing/route.ts', /information_schema\.tables/) && has('app/api/developer/testing/route.ts', /on_hand<0 OR reserved<0/));
check('developer destructive actions are staging-gated', has('app/api/developer/testing/route.ts', /environment\(\)==='staging'/) && has('app/api/developer/testing/route.ts', /destructiveActionsAllowed/) && has('app/api/developer/testing/route.ts', /STAGING_ONLY/));
check('developer test runs are audited', has('app/api/developer/testing/route.ts', /DEVELOPER_TEST_RUN/) && has('app/api/developer/testing/route.ts', /DEVELOPER_DESTRUCTIVE_TEST_RUN/) && has('app/api/developer/testing/route.ts', /DEVELOPER_STAGING_RESET/) && has('app/api/developer/testing/route.ts', /await audit\(/));
check('staging harness hard-blocks production and resets by prefix', has('lib/staging-test-harness.ts', /assertStaging/) && has('lib/staging-test-harness.ts', /GENZ_DEPLOYMENT_MODE/) && has('lib/staging-test-harness.ts', /STAGING_ONLY/) && has('lib/staging-test-harness.ts', /STGTEST-/));
check('staging harness covers customer/session/settlement lifecycle', has('lib/staging-test-harness.ts', /Create isolated member\/customer/) && has('lib/staging-test-harness.ts', /Customer → session lifecycle/) && has('lib/staging-test-harness.ts', /Session → settlement lifecycle/));
check('staging harness covers food/inventory/refund/concurrency/agent lifecycle', has('lib/staging-test-harness.ts', /Food order → kitchen → delivery → inventory\/COGS/) && has('lib/staging-test-harness.ts', /Paid order cancellation → refund/) && has('lib/staging-test-harness.ts', /Concurrent station\/session protection/) && has('lib/staging-test-harness.ts', /Station-agent command idempotency/));
check('staff role signing exists', has('lib/staff-auth.ts', /signStaffRole/) && has('lib/staff-auth.ts', /verifyStaffRole/));
check('login sets signed role cookie', has('app/api/staff/auth/route.ts', /result\.roleCookie/) && has('app/api/staff/auth/route.ts', /ROLE_COOKIE/));
check('middleware verifies role cookie cryptographically', has('middleware.ts', /verifyStaffRole/) && has('middleware.ts', /crypto\.subtle\.verify/) && has('middleware.ts', /GENZ_SESSION_SIGNING_SECRET/));
check('developer console is developer-only', has('middleware.ts', /path\.startsWith\('\/developer'\).*role==='DEVELOPER'/) && has('app/api/developer/features/route.ts', /staff\.role!==['"]DEVELOPER['"]/));
check('staff API has owner/developer delegation matrix', has('app/api/admin/staff/route.ts', /actor\.role==='OWNER'&&role!=='MANAGER'/) && has('app/api/admin/staff/route.ts', /actor\.role==='OWNER'&&target\.role!=='MANAGER'/) && has('app/api/admin/staff/route.ts', /STAFF_SELF_PROTECTION/));
check('staff UI calls canonical admin endpoint', has('app/(staff)/staff/page.tsx', /fetch\('\/api\/admin\/staff'/));
check('admin configuration allows owner/developer', has('app/api/admin/catalog/route.ts', /\['OWNER','DEVELOPER'\]\.includes\(staff\.role\)/));
check('feature status requires staff session', has('app/api/features/route.ts', /requireStaff/));

check('food pricing and availability are server authoritative', has('lib/pricing.ts', /member_price/) && has('lib/pricing.ts', /available/) && has('lib/pricing.ts', /inventory_batches/) && has('app/api/orders/route.ts', /createFoodOrder/));
check('customer unavailable overlay and responsive UI exists', has('app/customer/FoodCart.tsx', /NOT AVAILABLE RIGHT NOW/) && has('app/customer/FoodCart.tsx', /disabled=\{!i\.available\}/));
check('server validates unavailable food through atomic reservation', has('lib/food-orders.ts', /reserveOrderStock/) && has('lib/inventory.ts', /OUT_OF_STOCK/) && has('lib/inventory.ts', /FOR UPDATE/));
check('FIFO delivery consumption and COGS exists', has('lib/food-orders.ts', /deliverFoodOrder/) && has('lib/inventory.ts', /consumeMaterialFifo/) && has('lib/inventory.ts', /inventory_cogs_ledger/) && has('lib/inventory.ts', /expiry_at IS NULL OR b\.expiry_at>=CURDATE\(\)/));
check('order cancellation releases reservations', has('lib/food-orders.ts', /cancelFoodOrder/) && has('lib/food-orders.ts', /releaseOrderStock/));
check('food cancellation is limited to NEW and ACCEPTED before PREPARING', has('lib/food-orders.ts', /!\['NEW','ACCEPTED'\]\.includes\(String\(r\[0\]\.status\)\)/) && has('lib/food-orders.ts', /Order can only be cancelled before preparation starts/));
check('food refund policy uses 50 percent maximum before preparation', has('lib/food-orders.ts', /policyPercent:50/) && has('lib/food-orders.ts', /ADMIN_DESK_CASH/) && has('db/migrations/048_food_refund_policy.sql', /food_order_refunds/));
check('customer food cancellation endpoint exists', has('app/api/customer/orders/route.ts', /cancelFoodOrderByCustomer/) && has('app/api/customer/orders/route.ts', /ADMIN_DESK_CASH/));
check('admin desk food refund action exists', has('app/api/orders/route.ts', /refund-food/) && has('lib/food-orders.ts', /refundFoodOrder/));
check('idempotent ordering prevents duplicate checkout', has('lib/food-orders.ts', /client_idempotency_key/) && has('lib/food-orders.ts', /IDEMPOTENCY_CONFLICT/));
check('inventory negative stock prevented', has('lib/inventory.ts', /INSUFFICIENT_BATCH_STOCK/) && has('lib/inventory.ts', /reserved>=/));
check('inventory unit/integration suite exists', exists('tests/unit/inventory.test.ts') && exists('scripts/qa-mysql.mjs'));
check('inventory UI uses canonical backend actions', has('app/(staff)/inventory/stock/page.tsx', /action,'receive'/) && has('app/api/inventory/route.ts', /b\.action==='receive'/) && has('app/(staff)/inventory/receiving/page.tsx', /action:'receive'/) && has('app/api/inventory/materials/route.ts', /action==='receive'/) && has('app/(staff)/inventory/stocktakes/page.tsx', /stocktake-complete/) && has('app/api/inventory/materials/route.ts', /action==='stocktake-complete'/));

check('provider reconciliation exists', exists('lib/payment-provider-reconciliation.ts') && exists('app/api/finance/provider-reconciliation/route.ts'));
check('daily close controls exist', has('lib/daily-close-report.ts', /approveDailyClose/) && has('lib/daily-close-report.ts', /reopenDailyClose/));
check('station agent fail-safe exists', has('lib/station-agent-protocol.ts', /OFFLINE/) && has('lib/station-agent-protocol.ts', /LOCKED/) && has('lib/station-agent-protocol.ts', /ERROR/));
check('request ID and realtime replay exist', has('middleware.ts', /x-request-id/) && exists('lib/realtime.ts') && exists('app/api/events/route.ts'));
check('migration validator exists', exists('scripts/validate-migrations.mjs'));

check('MySQL boundary normalizes ISO timestamps', has('lib/mysql.ts', /normalizeDbValue/) && has('lib/mysql.ts', /ISO_DATETIME/) && has('lib/mysql.ts', /timezone:\s*'Z'/));
check('session datetime writes use DB-boundary normalization', has('lib/store.ts', /startedAt:started\.toISOString\(\)/) && has('lib/mysql.ts', /normalizeDbArgs/));
check('active memberships allow nullable expiry', has('app/api/sessions/route.ts', /expires_at IS NULL OR expires_at>=CURDATE\(\)/));
check('no active application membership-tier pricing contract remains', !has('lib/pricing.ts', /member_tier|memberTier/) && !has('app/api/sessions/route.ts', /member_tier|memberTier/));
check('no stale membership-tier UI contract remains', !has('app/(staff)/sessions/ParticipantManager.tsx', /memberTier|\.tier|expiresAt/) && !has('app/api/customers/route.ts', /m\.tier|expires_at/));

if (failures.length) {
  console.error(`QA contract checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`QA contract checks passed: ${migrations.length} migrations and food/inventory/payment/cross-module/developer/staff-security/browser controls.`);
