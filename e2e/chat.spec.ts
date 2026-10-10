import { test, expect } from '@playwright/test';
import { requireIsolatedMode } from './helpers';

test.describe('Isolated chat redesign', () => {
  test.skip(process.env.E2E_MODE !== 'isolated', 'Chat mutations are fixture-only');
  test('composer sends once and keeps the saved message', async ({ page }) => {
    await page.goto('/chat');
    requireIsolatedMode(page);
    const text = `Matchday message ${test.info().project.name}`;
    const input = page.locator('.chat-composer input');
    await input.fill(text);
    await page.getByRole('button', { name: /Senden|Send/, exact: true }).click();
    await expect(input).toHaveValue('');
    await expect(page.getByText(text, { exact: true })).toHaveCount(1);
    await expect(page.getByText(text, { exact: true })).toHaveAttribute('data-pending', 'false', { timeout: 30_000 });
    await page.reload();
    await expect(page.getByText(text, { exact: true })).toHaveCount(1);
    const box = await input.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  });
});