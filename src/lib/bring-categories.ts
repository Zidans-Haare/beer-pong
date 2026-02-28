export const BRING_CATEGORIES = [
    { key: 'BEER',   label: 'Bier',   emoji: '🍺' },
    { key: 'TABLES', label: 'Tische', emoji: '🏓' },
    { key: 'CUPS',   label: 'Becher', emoji: '🥤' },
    { key: 'BALLS',  label: 'Bälle',  emoji: '⚽' },
] as const;

export type BringCategory = typeof BRING_CATEGORIES[number]['key'];
