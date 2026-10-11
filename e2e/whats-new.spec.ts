import { test, expect } from '@playwright/test';

test.describe('Neu in der App', () => {
  test('erscheint einmal nach einem Update, führt zu den Neuerungen und kommt nicht wieder', async ({ page }) => {
    await page.addInitScript(() => { if (!window.sessionStorage.getItem('ran')) { window.sessionStorage.setItem('ran', '1'); window.localStorage.removeItem('whats-new-seen'); } });
    await page.goto('/');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole('link')).toHaveCount(4);
    await dialog.getByRole('link', { name: /Minispiel/ }).click();
    await expect(page).toHaveURL(/\/game$/, { timeout: 30_000 });
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => window.localStorage.getItem('whats-new-seen'))).toBeTruthy();
    // nach dem Neuladen bleibt es weg
    await page.goto('/');
    await page.waitForTimeout(2500);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('„Später“ schließt den Hinweis für diese Sitzung, aber merkt ihn nicht als gesehen', async ({ page }) => {
    await page.addInitScript(() => { if (!window.sessionStorage.getItem('ran')) { window.sessionStorage.setItem('ran', '1'); window.localStorage.removeItem('whats-new-seen'); } });
    await page.goto('/');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('button', { name: 'Später' }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => window.localStorage.getItem('whats-new-seen'))).toBeNull();
  });

  test('der Kurzlink auf die eigene Figur führt zur Figur-Seite', async ({ page }) => {
    await page.goto('/players/me');
    await expect(page).toHaveURL(/\/players\/[^/]+\/figure$/);
  });
});
