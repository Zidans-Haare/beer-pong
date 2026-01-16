/**
 * Pure utility functions for team operations (no server dependencies)
 * Can be safely imported in client components
 */

/**
 * Get team display name (custom name, or "Player1 & Player2", or fallback)
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

    if (member1 && member2) return `${member1} & ${member2}`;
    if (member1) return member1;
    if (member2) return member2;

    return 'Unbenanntes Team';
}
