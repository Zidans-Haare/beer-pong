import { test, expect } from '@playwright/test';

const hasCredentials = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe('Bilder laden korrekt', () => {
  test.skip(!hasCredentials, 'Keine E2E-Zugangsdaten gesetzt');

  test('Keine 404-Bilder auf der Startseite', async ({ page }) => {
    const failedImages: string[] = [];
    page.on('response', r => {
      if (r.request().resourceType() === 'image' && r.status() === 404)
        failedImages.push(r.url());
    });
    await page.goto('/');
    await page.waitForLoadState('load');
    expect(failedImages, `404-Bilder: ${failedImages.join(', ')}`).toHaveLength(0);
  });

  test('Keine 404-Bilder auf der Spieler-Seite', async ({ page }) => {
    const failedImages: string[] = [];
    page.on('response', r => {
      if (r.request().resourceType() === 'image' && r.status() === 404)
        failedImages.push(r.url());
    });
    await page.goto('/players');
    await page.waitForLoadState('load');
    expect(failedImages, `404-Bilder: ${failedImages.join(', ')}`).toHaveLength(0);
  });
});
