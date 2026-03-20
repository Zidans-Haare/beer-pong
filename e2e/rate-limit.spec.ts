import { test, expect } from '@playwright/test';

test.describe('Rate Limiting', () => {
  test('Passkey-Auth-Start wird nach zu vielen Requests geblockt', async ({ page }) => {
    const results: number[] = [];

    // 12 schnelle Requests (Limit: 10 pro Minute)
    for (let i = 0; i < 12; i++) {
      const res = await page.request.post('/api/auth/passkey/authenticate/start', {
        data: { email: 'test@test.de' },
      });
      results.push(res.status());
    }

    // Mindestens einer muss 429 sein
    expect(results).toContain(429);
  });
});
