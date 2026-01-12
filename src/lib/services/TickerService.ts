
import { prisma } from "@/lib/prisma";
import { GeminiService } from "@/lib/services/GeminiService";
import { broadcastNotification } from "@/app/actions/notifications";

export type TickerEventType = 'MATCH_START' | 'SCORE_UPDATE' | 'MATCH_END' | 'COMMENTARY';

export class TickerService {

    /**
     * Create a new ticker event.
     */
    static async createEvent(tournamentId: string, type: TickerEventType, content: string, matchId?: string) {
        // Create the event
        const event = await prisma.tickerEvent.create({
            data: {
                tournamentId,
                matchId,
                type,
                content
            }
        });

        // If it's a MATCH_END or significant update, maybe trigger commentary?
        // This is now usually called explicitly by the caller (MatchService), but we could double check here.

        return event;
    }

    /**
     * Get recent events for a tournament.
     */
    static async getEvents(tournamentId: string, limit = 20) {
        return await prisma.tickerEvent.findMany({
            where: { tournamentId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    /**
     * Trigger AI Commentary for a match context.
     */

    // ... imports

    // ... createEvent ...

    /**
     * Trigger AI Commentary for a match context.
     */
    static async triggerCommentary(tournamentId: string, matchId: string, context: string) {
        try {
            const commentary = await GeminiService.generateCommentary(context);
            if (commentary) {
                await this.createEvent(tournamentId, 'COMMENTARY', commentary, matchId);

                // Broadcast Notification (Type: TICKER)
                // Filtered to users who want live ticker updates
                await broadcastNotification({
                    title: '🎙️ Live-Kommentar',
                    message: commentary,
                    link: `/tournaments/${tournamentId}`,
                    type: 'TICKER'
                });
            }
        } catch (error) {
            console.error("Error triggering commentary:", error);
        }
    }
}
