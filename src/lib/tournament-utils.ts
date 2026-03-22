
export const TOURNAMENT_TYPE_LABELS: Record<string, string> = {
    'SINGLE_ELIMINATION': 'Elimination',
    'ROUND_ROBIN': 'Round Robin',
    'GROUPS': 'Groups & Knockout',
    'ELIMINATION': 'Elimination',
};

export function getTournamentTypeLabel(type: string): string {
    return TOURNAMENT_TYPE_LABELS[type] || type;
}
