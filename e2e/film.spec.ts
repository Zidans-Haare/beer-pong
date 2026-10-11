import { test, expect } from '@playwright/test';

const isolated = process.env.E2E_MODE === 'isolated';

test.describe('Turnierfilm', () => {
  test.skip(!isolated, 'Braucht die Testdaten der isolierten Umgebung');

  test('abgeschlossenes Turnier hat einen Play-Knopf, der den Film öffnet', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/tournaments/e2e-completed');
    const link = page.getByRole('link', { name: /Turnierfilm|Tournament film/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/tournaments\/e2e-completed\/film$/);

    const film = page.getByRole('dialog', { name: 'Last Matchday' });
    await expect(film).toBeVisible();
    // Abschnitte: Auftakt, Finale, Sieg, Podium, Zusammenfassung, Abspann
    await expect(film.locator('.wrapped-progress-track')).toHaveCount(6);
    // die Szene ist wirklich gezeichnet (Hintergrund deckt die ganze Fläche)
    await expect.poll(() => film.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.getContext('2d')!.getImageData(540, 1500, 1, 1).data[3])).toBe(255);

    // weiterblättern und schließen
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/tournaments\/e2e-completed$/);
    expect(errors).toEqual([]);
  });

  test('laufendes Turnier hat keinen Film', async ({ page }) => {
    await page.goto('/tournaments/e2e-active');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Turnierfilm|Tournament film/i })).toHaveCount(0);
    await page.goto('/tournaments/e2e-active/film');
    await expect(page.getByRole('link', { name: /Zum Turnier|Back to tournament/i })).toBeVisible();
  });
});
