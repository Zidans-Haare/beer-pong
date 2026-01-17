
export const TOURNAMENT_TYPE_LABELS: Record<string, string> = {
    'SINGLE_ELIMINATION': 'K.O. System',
    'ROUND_ROBIN': 'Jeder gegen Jeden',
    'GROUPS': 'Gruppen & K.O.',
    'ELIMINATION': 'K.O. System',
};

export function getTournamentTypeLabel(type: string): string {
    return TOURNAMENT_TYPE_LABELS[type] || type;
}
