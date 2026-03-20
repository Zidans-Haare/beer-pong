import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Bilder laden korrekt', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) { test.skip(); return; }
    await login(page, email, password);
  });

  test('Keine 404-Bilder auf der Startseite', async ({ page }) => {
    const failedImages: string[] = [];
    page.on('response', r => {
      if (r.request().resourceType() === 'image' && r.status() === 404)
        failedImages.push(r.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(failedImages, `404-Bilder: ${failedImages.join(', ')}`).toHaveLength(0);
  });

  test('Keine 404-Bilder auf der Spieler-Seite', async ({ page }) => {
    const failedImages: string[] = [];
    page.on('response', r => {
      if (r.request().resourceType() === 'image' && r.status() === 404)
        failedImages.push(r.url());
    });

    await page.goto('/players');
    await page.waitForLoadState('networkidle');
    expect(failedImages, `404-Bilder: ${failedImages.join(', ')}`).toHaveLength(0);
  });
});
