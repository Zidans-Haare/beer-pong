/**
 * Team utility functions
 */

/**
 * Get team display name
 */
export function getTeamDisplayName(team: {
    name?: string | null;
    player1?: { name: string } | null;
    player2?: { name: string } | null;
    guest1?: { name: string } | null;
    guest2?: { name: string } | null;
}): string {
    if (team.name) return team.name;

    const member1 = team.player1?.name || team.guest1?.name;
    const member2 = team.player2?.name || team.guest2?.name;

    if (member1 && member2) {
        return `${member1} & ${member2}`;
    } else if (member1) {
        return member1;
    } else if (member2) {
        return member2;
    }

    return 'Leeres Team';
}
