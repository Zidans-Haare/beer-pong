import { test, expect } from '@playwright/test';

test.describe('Bilder laden korrekt', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) {
      test.skip();
      return;
    }

    await page.goto('/login');
    await page.getByRole('textbox').first().fill(email);
    await page.getByRole('textbox').nth(1).fill(password);
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await expect(page.locator('.bottom-nav')).toBeVisible({ timeout: 8000 });
  });

  test('Keine 404-Bilder auf der Startseite', async ({ page }) => {
    const failedImages: string[] = [];

    page.on('response', response => {
      if (
        response.request().resourceType() === 'image' &&
        response.status() === 404
      ) {
        failedImages.push(response.url());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(failedImages, `404-Bilder gefunden: ${failedImages.join(', ')}`).toHaveLength(0);
  });

  test('Keine 404-Bilder auf der Spieler-Seite', async ({ page }) => {
    const failedImages: string[] = [];

    page.on('response', response => {
      if (
        response.request().resourceType() === 'image' &&
        response.status() === 404
      ) {
        failedImages.push(response.url());
      }
    });

    await page.goto('/players');
    await page.waitForLoadState('networkidle');

    expect(failedImages, `404-Bilder gefunden: ${failedImages.join(', ')}`).toHaveLength(0);
  });
});
