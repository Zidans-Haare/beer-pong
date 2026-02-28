export const BRING_CATEGORIES = [
    { key: 'BEER',   label: 'Bier'   },
    { key: 'TABLES', label: 'Tische' },
    { key: 'CUPS',   label: 'Becher' },
    { key: 'BALLS',  label: 'Bälle'  },
] as const;

export type BringCategory = typeof BRING_CATEGORIES[number]['key'];
