/**
 * Puppeteer-Script für Lighthouse CI — loggt den E2E-User ein
 * bevor Lighthouse die geschützten Seiten testet.
 */
module.exports = async (browser) => {
  const page = await browser.newPage();

  await page.goto('https://bier.olomek.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Falls bereits eingeloggt (Redirect zur Startseite), nichts tun
  const emailInput = await page.$('input[name="email"]');
  if (!emailInput) {
    await page.close();
    return;
  }

  await page.type('input[name="email"]', process.env.E2E_USER_EMAIL || '');
  await page.type('input[name="password"]', process.env.E2E_USER_PASSWORD || '');

  await page.click('button[type="submit"]');
  // Server Actions don't trigger a classic navigation — wait for URL to leave /login
  await page.waitForFunction(
    () => !window.location.pathname.startsWith('/login'),
    { timeout: 30000 },
  );

  await page.close();
};
