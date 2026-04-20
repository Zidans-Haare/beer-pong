module.exports = {
  ci: {
    collect: {
      url: [
        'https://bier.olomek.com/',
        'https://bier.olomek.com/players',
        'https://bier.olomek.com/players/new',
        'https://bier.olomek.com/tournaments',
        'https://bier.olomek.com/tournaments/new',
        'https://bier.olomek.com/tournaments/archive',
        'https://bier.olomek.com/stats',
        'https://bier.olomek.com/chat',
        'https://bier.olomek.com/notifications',
        'https://bier.olomek.com/settings',
        'https://bier.olomek.com/streaming',
        'https://bier.olomek.com/rules',
        'https://bier.olomek.com/register',
      ],
      puppeteerScript: './lighthouse-auth.js',
      puppeteerLaunchOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
      numberOfRuns: 1,
    },
    upload: {
      target: 'lhci',
      serverBaseUrl: 'https://lighthouse.olomek.com',
      token: process.env.LHCI_TOKEN,
    },
    assert: {
      budgetFile: '.github/lighthouse-budget.json',
    },
  },
};
