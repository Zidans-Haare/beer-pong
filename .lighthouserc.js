module.exports = {
  ci: {
    collect: {
      url: [
        'https://bier.olomek.com/',
        'https://bier.olomek.com/players',
        'https://bier.olomek.com/tournaments',
        'https://bier.olomek.com/stats',
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
