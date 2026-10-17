import { test, expect } from '@playwright/test';

const isolated = process.env.E2E_MODE === 'isolated';

test.describe('Figur anpassen', () => {
  test.skip(!isolated, 'Braucht die Testdaten der isolierten Umgebung');

  test('Figur gestalten, speichern und überall verfügbar machen', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    // vom Profil aus erreichbar
    await page.goto('/players');
    await page.getByRole('link', { name: /Figur gestalten/ }).click();
    await expect(page).toHaveURL(/\/players\/e2e-host-player\/figure$/);
    await expect(page.getByRole('heading', { name: 'Meine Figur' })).toBeVisible();

    // die Vorschau ist gezeichnet
    const front = page.locator('.figure-preview canvas').first();
    await expect.poll(() => front.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(270, 100, 1, 1).data[3])).toBe(255);

    // ohne Änderung kann man nicht speichern
    await expect(page.getByRole('button', { name: 'Speichern' })).toBeDisabled();

    await page.getByRole('radio', { name: 'Lang' }).click();
    await page.getByRole('radio', { name: 'Brille', exact: true }).click();
    await page.getByRole('radio', { name: 'Streifen' }).click();
    await page.getByRole('radio', { name: 'Kräftig' }).click();
    // Zubehör kombinieren: eine Kopfbedeckung ersetzt die andere, Brille und Extras kommen dazu
    await page.getByRole('radio', { name: 'Kappe' }).click();
    await page.getByRole('radio', { name: 'Bierhut' }).click();
    await expect(page.getByRole('radio', { name: 'Kappe' })).not.toBeChecked();
    await page.getByRole('button', { name: 'Bart' }).click();
    await page.getByRole('button', { name: 'Schal' }).click();
    await page.getByRole('radio', { name: 'Hautfarbe 4' }).click();
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.locator('.figure-bar-state')).toContainText('Gespeichert');

    // bleibt nach dem Neuladen erhalten und steht allen Szenen zur Verfügung
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Lang' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Brille', exact: true })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Hautfarbe 4' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Bierhut' })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Schal' })).toHaveAttribute('aria-pressed', 'true');
    const api = await page.request.get('/api/figures');
    const data = await api.json() as { me: string; figures: Record<string, { hairStyle: string; accessories: string[]; build: number; skin: number }> };
    const mine = data.figures[data.me.toLowerCase()];
    expect(mine).toMatchObject({ hairStyle: 'long', accessories: ['beerhat', 'glasses', 'beard', 'scarf'], build: 2, skin: 3 });

    // Startseite: Die gestaltete Figur winkt oben rechts; die Figur sitzt direkt auf der grauen Linie
    await page.goto('/');
    const hero = page.locator('.home-figure');
    await expect(hero).toBeVisible();
    await expect.poll(() => hero.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(150, 120, 1, 1).data[3])).toBe(255);
    const headerBox = (await page.locator('.home-header').boundingBox())!;
    const figureBox = (await hero.boundingBox())!;
    expect(Math.abs(figureBox.y + figureBox.height - (headerBox.y + headerBox.height))).toBeLessThan(3);
    // Profil: die gestaltete Figur steht ohne Hintergrund auf der Seite
    await page.goto('/players/e2e-host-player');
    const stage = page.locator('.profile-figure-canvas');
    await expect(stage).toBeVisible();
    await expect.poll(() => stage.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(180, 200, 1, 1).data[3])).toBe(255);
    expect(await stage.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(4, 4, 1, 1).data[3])).toBe(0);
    await page.goto('/players/e2e-host-player/figure');

    // Zufall würfelt etwas Gültiges, Zurücksetzen holt das Standardaussehen
    await page.getByRole('button', { name: 'Zufall' }).click();
    await page.getByRole('button', { name: 'Zurücksetzen' }).click();
    await expect(page.locator('.figure-bar-state')).toContainText('Zurückgesetzt');
    const after = await (await page.request.get('/api/figures')).json() as { me: string; figures: Record<string, unknown> };
    expect(after.figures[after.me.toLowerCase()]).toBeUndefined();
    // ohne gestaltete Figur gibt es weder auf der Startseite noch auf dem Profil eine
    await page.goto('/');
    await expect(page.locator('.home-figure')).toHaveCount(0);
    await page.goto('/players/e2e-host-player');
    await expect(page.locator('.profile-figure-canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('auf dem Profil stehen die Knöpfe nebeneinander und die Figur tanzt, auch bei anderen Spielern', async ({ page }) => {
    await page.goto('/players/e2e-host-player');
    const edit = page.getByRole('link', { name: 'Profil bearbeiten' });
    const figure = page.getByRole('link', { name: 'Figur gestalten' });
    const a = (await edit.boundingBox())!, b = (await figure.boundingBox())!;
    // in einer Zeile: gleiche Höhe, nebeneinander
    expect(Math.abs(a.y - b.y)).toBeLessThan(6);
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);

    // die Knöpfe stehen mittig
    const box = (await page.locator('.profile-actions').boundingBox())!;
    const left = a.x - box.x, right = box.x + box.width - (b.x + b.width);
    expect(Math.abs(left - right)).toBeLessThan(6);

    // ohne gestaltete Figur gibt es keine Figur auf dem Profil
    await expect(page.locator('.profile-figure-canvas')).toHaveCount(0);

    // ein anderer Spieler: ohne Gestaltung keine Figur und ohne Berechtigung keine Knöpfe
    await page.goto('/players/e2e-player-player');
    await expect(page.locator('.profile-figure-canvas')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Figur gestalten' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Profil bearbeiten' })).toHaveCount(0);
  });

  test('Hintergrund der Szenen wählen: fünf zur Wahl, Stadion ist Standard, die Wahl bleibt', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/players/e2e-host-player/figure');
    const group = page.getByRole('radiogroup', { name: 'Hintergrund deiner Szenen' });
    await expect(group.getByRole('radio')).toHaveCount(5);
    await expect(group.getByRole('radio', { name: 'Stadion' })).toHaveAttribute('aria-checked', 'true');
    // die Vorschauen sind gezeichnet
    await expect.poll(() => group.locator('canvas').first().evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(10, 10, 1, 1).data[3])).toBe(255);
    await group.getByRole('radio', { name: 'Strand' }).click();
    await expect(group.getByRole('radio', { name: 'Strand' })).toHaveAttribute('aria-checked', 'true');
    await page.waitForLoadState('networkidle');
    await page.reload();
    await expect(page.getByRole('radiogroup', { name: 'Hintergrund deiner Szenen' }).getByRole('radio', { name: 'Strand' })).toHaveAttribute('aria-checked', 'true');
    // zurück zum Stadion, damit andere Tests das Standardbild sehen
    await page.getByRole('radiogroup', { name: 'Hintergrund deiner Szenen' }).getByRole('radio', { name: 'Stadion' }).click();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('fremde Figuren lassen sich nicht ändern', async ({ page }) => {
    await page.goto('/players/e2e-player-player/figure');
    await expect(page.getByRole('heading', { name: 'Keine Berechtigung' })).toBeVisible();
  });
});
