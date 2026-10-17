import { test, expect } from '@playwright/test';
import { requireIsolatedMode } from './helpers';

test.describe('Isolated chat redesign', () => {
  test.skip(process.env.E2E_MODE !== 'isolated', 'Chat mutations are fixture-only');

  test('composer sends once and keeps the saved message', async ({ page }) => {
    await page.goto('/chat');
    requireIsolatedMode(page);
    const text = `Matchday message ${test.info().project.name}`;
    const input = page.locator('.chat-composer textarea');
    await input.fill(text);
    await page.getByRole('button', { name: /Senden|Send/, exact: true }).click();
    await expect(input).toHaveValue('');
    const bubble = page.locator('.chat-bubble', { hasText: text });
    await expect(bubble).toHaveCount(1);
    await expect(bubble).toHaveAttribute('data-pending', 'false', { timeout: 30_000 });
    await page.reload();
    await expect(page.locator('.chat-bubble', { hasText: text })).toHaveCount(1);
    const box = await input.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  });

  test('wie im Messenger: mehrere Nachrichten schnell hintereinander, Tastatur bleibt offen, eigene rechts', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/chat');
    requireIsolatedMode(page);
    const input = page.locator('.chat-composer textarea');
    const stamp = Date.now();
    const texts = [1, 2, 3].map(n => `Schnell ${n} ${stamp}`);
    for (const text of texts) {
      await input.fill(text);
      await input.press('Enter');
      // Fokus bleibt im Feld, damit die Tastatur nicht zuklappt
      await expect(input).toBeFocused();
    }
    for (const text of texts) {
      await expect(page.locator('.chat-bubble', { hasText: text })).toHaveAttribute('data-pending', 'false', { timeout: 30_000 });
    }
    // Reihenfolge bleibt, alle drei sind eine Gruppe rechts
    const rows = page.locator('.chat-row.is-mine');
    await expect(rows.last()).toContainText(texts[2]);
    const lastBox = (await page.locator('.chat-bubble', { hasText: texts[2] }).boundingBox())!;
    expect(lastBox.x + lastBox.width).toBeGreaterThan(390 / 2);
    // Umschalt+Enter macht eine neue Zeile statt zu senden
    await input.fill('Zeile eins');
    await input.press('Shift+Enter');
    await input.type('Zeile zwei');
    await expect(input).toHaveValue('Zeile eins\nZeile zwei');
    // nichts liegt über dem Bildschirmrand, die Seite dahinter scrollt nicht
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.reload();
    for (const text of texts) await expect(page.locator('.chat-bubble', { hasText: text })).toHaveCount(1);
    expect(errors).toEqual([]);
  });
});
