import { test, expect } from '@playwright/test';
import { requireIsolatedMode } from './helpers';

test.describe('Isolated admin redesign', () => {
  test.skip(process.env.E2E_MODE !== 'isolated', 'Never run admin mutations against production');
  test.use({ storageState: 'e2e/.auth/admin.json' });
  for (const route of ['/admin', '/admin/users', '/admin/players', '/admin/tournaments', '/admin/guests', '/admin/chat', '/admin/broadcast', '/admin/settings', '/admin/passkeys', '/admin/approvals', '/admin/seasons']) {
    test(`admin layout ${route}`, async ({ page }, testInfo) => {
      const failures: string[] = [];
      page.on('pageerror', error => failures.push(error.message));
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(500);
      await expect(page).toHaveURL(route);
      await expect(page.locator('.admin-main')).toBeVisible();
      if (route === '/admin/broadcast' && testInfo.project.name !== 'chromium') await expect(page.locator('.bottom-nav')).toBeVisible();
      const size = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
      expect(size.content, route).toBeLessThanOrEqual(size.viewport + 1);
      await page.screenshot({ path: testInfo.outputPath('admin.png'), fullPage: true, animations: 'disabled' });
      await page.screenshot({ path: testInfo.outputPath('viewport.png'), animations: 'disabled' });
      expect(failures).toEqual([]);
    });
  }

  test('mobile area selection exposes all eleven admin destinations', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium', 'Mobile area selection only');
    await page.goto('/admin');
    await page.locator('.admin-section-button').click();
    await expect(page.getByRole('dialog').getByRole('link')).toHaveCount(11);
    await page.getByRole('dialog').getByRole('link', { name: /Passkeys/ }).click();
    await expect(page).toHaveURL('/admin/passkeys', { timeout: 30_000 });
  });

  test('approval still activates a pending user', async ({ page }) => {
    await page.goto('/admin/approvals');
    requireIsolatedMode(page);
    await expect(page.getByText('pending@matchday.test')).toBeVisible();
    await page.getByRole('button', { name: /Freigeben|Genehmigen|Approve|Akzeptieren/ }).click();
    await expect(page.getByText('pending@matchday.test')).not.toBeVisible({ timeout: 30_000 });
  });

  test('player edit sheet preserves all profile fields', async ({ page }) => {
    await page.goto('/admin/players');
    requireIsolatedMode(page);
    await page.getByRole('button', { name: /: Robin$/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Name *', { exact: true })).toHaveValue('Robin');
    await dialog.getByLabel('Nickname', { exact: true }).fill('Matchday Robin');
    await dialog.getByLabel('Bio', { exact: true }).fill('Club player');
    await dialog.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible({ timeout: 30_000 });
    await page.reload();
    await expect(page.getByText('Matchday Robin', { exact: true })).toBeVisible();
  });
});

test('ordinary users cannot enter admin', async ({ page }) => {
  test.skip(process.env.E2E_MODE !== 'isolated');
  await page.goto('/admin');
  await expect(page).toHaveURL('/');
  await expect(page.locator('.admin-main')).not.toBeVisible();
});