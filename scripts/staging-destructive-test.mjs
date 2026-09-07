import { runStagingDestructiveSuite } from '../lib/staging-test-harness.ts';

const keepData = process.argv.includes('--keep-data');
if ((process.env.GENZ_DEPLOYMENT_MODE || 'production') !== 'staging') {
  console.error('STAGING_ONLY: test:staging requires GENZ_DEPLOYMENT_MODE=staging. No destructive operation was attempted.');
  process.exit(2);
}

try {
  const result = await runStagingDestructiveSuite({ keepData });
  for (const check of result.results) console.log(`${check.status.padEnd(4)} ${check.name}: ${check.message}`);
  console.log(`Staging suite ${result.ok ? 'PASSED' : 'FAILED'} — ${result.passed} passed, ${result.failed} failed, reset=${result.reset}`);
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
