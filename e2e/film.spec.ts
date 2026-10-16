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

  test('Siegerehrung: die Top 3 stehen auf dem Podest statt in Kästen, bei jedem Öffnen', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    // die Abfrage einmal vorwärmen (der Entwicklungsserver übersetzt sie beim ersten Aufruf), dann zählt die Zeit bis zum Bild
    expect((await page.request.get('/api/tournaments/e2e-completed/podium')).ok()).toBe(true);
    await page.goto('/tournaments/e2e-completed');
    const podium = page.locator('.winner-podium[data-ready="true"]');
    await expect(podium).toBeVisible();
    // die Top 3 sind nach einer halben Sekunde im Bild (vom Öffnen der Seite bis zum ersten gezeichneten Bild)
    await expect.poll(() => page.evaluate(() => performance.getEntriesByName('winner-overlay-e2e-completed')[0]?.duration ?? -1)).toBeGreaterThan(0);
    const ms = await page.evaluate(() => performance.getEntriesByName('winner-overlay-e2e-completed')[0].duration);
    expect(ms).toBeLessThan(500);
    // die alten Kästen mit Sieger, 2. und 3. gibt es nicht mehr
    await expect(page.getByText(/^Sieger:|^Winner:/)).toHaveCount(0);
    // Podest und Figuren sind gezeichnet
    await expect.poll(() => podium.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
      return false;
    })).toBe(true);
    // Tippen spielt die Ehrung noch einmal ab, das Podest bleibt
    await podium.click();
    await expect(podium).toBeVisible();

    // zweiter Besuch: wieder da
    await page.goto('/tournaments/e2e-completed');
    await expect(page.locator('.winner-podium[data-ready="true"]')).toBeVisible();
    // ein laufendes Turnier zeigt keines
    await page.goto('/tournaments/e2e-active');
    await page.waitForTimeout(1500);
    await expect(page.locator('.winner-podium')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
