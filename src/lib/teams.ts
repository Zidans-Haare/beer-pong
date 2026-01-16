/**
 * Helper functions for team operations
 */

import { prisma } from '@/lib/prisma';

/**
 * Check if a user (by userId) is a member of a team
 * Returns true if user's player profile is part of team (player1 or player2)
 */
export async function isUserInTeam(userId: string, teamId: string): Promise<boolean> {
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            player1: { select: { userId: true } },
            player2: { select: { userId: true } }
        }
    });

    if (!team) return false;

    return team.player1?.userId === userId || team.player2?.userId === userId;
}

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
