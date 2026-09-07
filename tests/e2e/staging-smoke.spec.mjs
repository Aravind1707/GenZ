import { test, expect } from '@playwright/test';

const mobile = `9${String(Date.now()).slice(-9)}`;

test.describe('GenZ staging browser smoke', () => {
  test('health, customer OTP, membership pricing and food menu', async ({ page, request }) => {
    const health = await request.get('/api/health');
    expect(health.ok()).toBeTruthy();
    const healthJson = await health.json();
    expect(healthJson.ok).toBeTruthy();
    expect(healthJson.latestMigration).toBe(52);

    await page.goto('/customer');
    await expect(page.getByText('Login with mobile')).toBeVisible();
    await page.getByLabel('Mobile number').fill(mobile);
    await page.getByRole('button', { name: 'Send OTP' }).click();
    await expect(page.getByText(/DEV OTP:/)).toBeVisible();
    const devOtp = (await page.getByText(/DEV OTP:/).innerText()).replace('DEV OTP:', '').trim();
    expect(devOtp).toMatch(/^\d{6}$/);
    await page.getByLabel('One-time password').fill(devOtp);
    await page.getByRole('button', { name: 'Verify & continue' }).click();

    await expect(page.getByText('NON-MEMBER')).toBeVisible();
    await page.getByRole('button', { name: 'Membership Prices' }).click();
    await expect(page.getByText('Membership pricing')).toBeVisible();
    await expect(page.getByText('240Hz PC / PS5 Multi')).toBeVisible();
    await page.getByRole('button', { name: 'Food & Beverages' }).click();
    await expect(page.getByText('Classic Chicken Burger')).toBeVisible();
    await expect(page.getByText('Food ordering is tied to your active station session.')).toBeVisible();
  });

  test('public security headers and protected developer API', async ({ request }) => {
    const page = await request.get('/customer');
    expect(page.headers()['x-content-type-options']).toBe('nosniff');
    expect(page.headers()['x-frame-options']).toBe('DENY');

    const developer = await request.get('/api/developer/testing');
    expect(developer.status()).toBe(401);
  });
});
