/**
 * Puppeteer-Script für Lighthouse CI — loggt den E2E-User ein
 * bevor Lighthouse die geschützten Seiten testet.
 */
module.exports = async (browser) => {
  const page = await browser.newPage();

  await page.goto('https://bier.olomek.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.type('input[name="email"]', process.env.E2E_USER_EMAIL || '');
  await page.type('input[name="password"]', process.env.E2E_USER_PASSWORD || '');

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.close();
};
