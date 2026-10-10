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
    await expect(page.getByText(/^Spieler direkt hinzufügen/)).toBeVisible();
    await expect(page.getByPlaceholder('Spieler suchen...')).toBeVisible();
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
