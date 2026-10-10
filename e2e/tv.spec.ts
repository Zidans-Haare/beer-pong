import { test, expect } from '@playwright/test';

test.describe('Isolated TV redesign', () => {
  test.skip(process.env.E2E_MODE !== 'isolated', 'Fixture tournaments only');

  test('result overlay shows readable names and scores', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/tournaments/e2e-active/tv');
    const panel = page.locator('.tv-result-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Sam');
    await expect(panel).toContainText('Robin');
    await expect(panel).toContainText('10');
    await expect(panel).toContainText('6');
    await panel.screenshot({ path: testInfo.outputPath('result.png'), animations: 'disabled' });
    await expect(panel).not.toBeVisible({ timeout: 8_000 });
  });

  test('camera controller keeps tools and return path reachable', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto('/tournaments/e2e-active/broadcast');
    await expect(page.locator('.broadcast-screen')).toBeVisible();
    await expect(page.locator('.bottom-nav')).not.toBeVisible();
    for (const name of ['Stream starten', 'Drehen', 'Spiegeln', 'Rauszoomen', 'Reinzoomen']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Spiegeln', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Spiegeln', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('link', { name: 'Zum Turnier', exact: true }).click();
    await expect(page).toHaveURL('/tournaments/e2e-active', { timeout: 30_000 });
  });
  for (const size of [{ width: 1920, height: 1080 }, { width: 3840, height: 2160 }]) {
    test(`broadcast screen ${size.width}`, async ({ page }, testInfo) => {
      await page.setViewportSize(size);
      await page.goto('/tournaments/e2e-active/tv');
      await expect(page.locator('.tv-screen')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Matchday Open' })).toBeVisible();
      await expect(page.locator('.bottom-nav')).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Vollbild', exact: true })).toBeVisible();
      const box = await page.locator('.tv-screen').boundingBox();
      expect(box?.width).toBe(size.width);
      expect(box?.height).toBe(size.height);
      await expect(page.locator('.tv-result-backdrop')).not.toBeVisible({ timeout: 8_000 });
      await page.screenshot({ path: testInfo.outputPath('tv.png') });
    });
  }
});