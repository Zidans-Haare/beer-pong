import { test, expect } from '@playwright/test';
import { requireIsolatedMode } from './helpers';

const hasCredentials = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe('Turniere (öffentlich)', () => {
  test('Turnier-Übersicht lädt oder leitet zu Login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/tournaments');
    const url = page.url();
    expect(url).toMatch(/\/tournaments|\/login/);
  });

  test('GET /api/tournaments/by-code/:code — ungültiger Code gibt Fehler', async ({ page }) => {
    const res = await page.request.get('/api/tournaments/by-code/INVALID123');
    expect([400, 401, 404]).toContain(res.status());
  });
});

test.describe('Isolated match scoring', () => {
  test.skip(process.env.E2E_MODE !== 'isolated', 'Only isolated fixture data may be changed');

  test('Turnier anlegen: Datum passt aufs Handy, Gästezimmer-Bild wird angezeigt', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tournaments/new');
    requireIsolatedMode(page);
    await page.locator('input[name="name"]').fill('E2E Gästezimmer');
    await page.locator('input[name="location"]').fill('Club House');
    // "Später": Das Datumsfeld bleibt in seinem Kasten und ist in Ortszeit vorbelegt
    await page.getByText('Später', { exact: true }).click();
    const date = page.locator('input[name="date"]');
    await expect(date).toBeVisible();
    const box = (await date.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    const local = await page.evaluate(() => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:`; });
    expect(await date.inputValue()).toContain(`T${local}`);
    await page.getByText('Jetzt', { exact: true }).click();
    // Gästezimmer mit Bild
    await page.getByText('Gästezimmer für Übernachtung anbieten').click();
    await page.locator('input[name="guestRoomTitle"]').fill('Sofa');
    await page.locator('[name="guestRoomDescription"]').fill('Gemütlich');
    await page.locator('input[name="guestRoomImage"]').setInputFiles('public/screenshot-wide.png');
    await page.getByRole('button', { name: /Erstellen|starten/i }).last().click();
    await expect(page).toHaveURL(/\/tournaments\/(?!new)[^/?]+/, { timeout: 30_000 });
    await page.goto(page.url().split('?')[0]);
    const img = page.locator('img[alt="Guest Room"]');
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
    // verkleinert und als JPEG gespeichert
    expect(await img.getAttribute('src')).toMatch(/^\/uploads\/room_\d+\.jpg$/);
  });

  test('Host bearbeitet ein geplantes Turnier: Zeit, Ort, Modus, Tische und Spieler', async ({ page, browser }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/tournaments/e2e-groups');
    requireIsolatedMode(page);
    await page.getByRole('button', { name: 'Turnier bearbeiten' }).click();
    const dialog = page.getByRole('dialog', { name: 'Turnier bearbeiten' });
    await expect(dialog).toBeVisible();
    // Zeit in Ortszeit, Ort, 2 vs 2, Tische und Spieler
    await dialog.locator('input[type="datetime-local"]').fill('2026-12-24T19:30');
    await dialog.getByLabel('Ort').fill('Bei Sam');
    await dialog.getByRole('button', { name: '2 vs 2' }).click();
    // aus Spaß wird Liga
    await dialog.getByRole('button', { name: 'Liga', exact: true }).click();
    await dialog.getByRole('button', { name: 'Ein Tisch mehr' }).click();
    await dialog.getByRole('button', { name: 'Jamie', exact: true }).click();
    await dialog.getByPlaceholder('Spieler suchen...').fill('Casey');
    await dialog.getByRole('button', { name: 'Casey', exact: true }).click();
    await dialog.getByRole('button', { name: 'Speichern' }).click();
    await expect(dialog).toHaveCount(0);

    const header = page.locator('header.tournament-header');
    await expect(header).toContainText('24. Dezember um 19:30 Uhr');
    await expect(header).toContainText('Bei Sam');
    await expect(header).toContainText('2v2');
    await expect(header).toContainText('Liga');
    // Jamie (extra-0) ist raus, Casey dazu
    await page.getByRole('button', { name: 'Turnier bearbeiten' }).click();
    await expect(dialog.getByRole('button', { name: 'Casey', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByRole('button', { name: 'Jamie', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(dialog.locator('output')).toHaveText('3');
    await dialog.getByRole('button', { name: 'Abbrechen' }).click();

    // andere sehen keinen Stift
    const context = await browser.newContext({ storageState: 'e2e/.auth/player.json' });
    const other = await context.newPage();
    await other.goto('/tournaments/e2e-groups');
    await expect(other.locator('header.tournament-header')).toContainText('Bei Sam');
    await expect(other.getByRole('button', { name: 'Turnier bearbeiten' })).toHaveCount(0);
    await context.close();
    // laufende Turniere haben keinen Stift
    await page.goto('/tournaments/e2e-active');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Turnier bearbeiten' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('joining by code completes outside server rendering', async ({ page }) => {
    await page.goto('/join/CLUB26');
    await expect(page).toHaveURL('/tournaments/e2e-planned', { timeout: 30_000 });
    requireIsolatedMode(page);
    await expect(page.getByRole('button', { name: 'Dabei', exact: true })).toBeVisible();
  });

  test('team scoring keeps team identities and overtime values', async ({ page }) => {
    await page.goto('/tournaments/e2e-team');
    requireIsolatedMode(page);
    const match = page.locator('#match-e2e-team-match');
    await match.click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Baseline Club', exact: true }).click();
    await dialog.getByRole('button', { name: /Verlängerung/ }).click();
    await dialog.getByRole('button', { name: '1', exact: true }).click();
    await dialog.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible({ timeout: 30_000 });
    await expect(match).toContainText('13');
    await expect(match).toContainText('11');
    await expect(match).toContainText('Baseline Club');
    await expect(match).toContainText('Sidecourt');
  });

  test('creation retains every original option group', async ({ page }) => {
    await page.goto('/tournaments/new');
    for (const name of ['name', 'location', 'mode', 'isRanked', 'type', 'tableCount', 'startImmediately']) await expect(page.locator(`[name="${name}"]`).first()).toBeAttached();
    for (const text of ['Zeitplanung', 'Spielmodus', 'Turnier-Format', 'Anzahl der Tische']) await expect(page.getByText(text, { exact: true })).toBeVisible();
    // Spieler kommen erst nach dem Anlegen dazu (Stift in der Turnierübersicht)
    await expect(page.getByText(/^Spieler direkt hinzufügen/)).toHaveCount(0);
  });

  test('normal scores and repeated overtime preserve the saved result', async ({ page }) => {
    await page.goto('/tournaments/e2e-active');
    requireIsolatedMode(page);
    const match = page.locator('#match-e2e-active-match-2');
    await match.click();
    let dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Jamie', exact: true }).click();
    await dialog.getByRole('button', { name: '6', exact: true }).click();
    await dialog.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible({ timeout: 30_000 });
    await expect(match).toContainText('10');
    await expect(match).toContainText('6');
    await match.click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('textbox')).toHaveValue('6');
    await dialog.getByRole('button', { name: 'Jamie', exact: true }).click();
    await dialog.getByRole('button', { name: /Verlängerung/ }).click();
    await dialog.getByRole('button', { name: 'OT+', exact: true }).click();
    await dialog.getByRole('button', { name: '2', exact: true }).click();
    await dialog.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible({ timeout: 30_000 });
    await expect(match).toContainText('16');
    await expect(match).toContainText('15');
    await match.click();
    await expect(page.getByRole('dialog').getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

test.describe('Turniere (eingeloggt)', () => {
  test.skip(!hasCredentials, 'Keine E2E-Zugangsdaten gesetzt');

  test('Turniere-Seite zeigt Heading', async ({ page }) => {
    await page.goto('/tournaments');
    await expect(page.getByRole('heading', { name: /Turniere/i })).toBeVisible();
  });

  test('Archiv-Seite erreichbar', async ({ page }) => {
    await page.goto('/tournaments/archive');
    await expect(page).toHaveURL('/tournaments/archive');
  });

  test('Neues Turnier erstellen — Seite erreichbar', async ({ page }) => {
    await page.goto('/tournaments/new');
    await expect(page).toHaveURL('/tournaments/new');
    await expect(page.getByRole('button', { name: /Erstellen|Speichern|starten/i })).toBeVisible();
  });

  test('Ungültige Turnier-ID gibt 404 oder Fehler', async ({ page }) => {
    await page.goto('/tournaments/dieses-turnier-gibt-es-nicht-99999');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible({ timeout: 10_000 });
  });

  test('Join-Seite mit falschem Code zeigt Fehler oder 404', async ({ page }) => {
    await page.goto('/join/XXXXXX');
    await page.waitForLoadState('load');
    // notFound() wird aufgerufen → 404-Überschrift erscheint
    await expect(page.getByRole('heading', { name: /404/i })).toBeVisible({ timeout: 30_000 });
  });
});
