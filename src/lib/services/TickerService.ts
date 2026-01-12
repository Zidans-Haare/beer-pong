
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

        // Broadcast Notification based on type
        let title = '🎙️ Live-Ticker';
        if (type === 'SCORE_UPDATE') title = '🎯 Spielstand Update';
        else if (type === 'MATCH_START') title = '🚀 Match gestartet';
        else if (type === 'MATCH_END') title = '🏁 Match beendet';
        else if (type === 'COMMENTARY') title = '🎙️ Live-Kommentar';

        await broadcastNotification({
            title,
            message: content,
            link: `/tournaments/${tournamentId}`,
            type: 'TICKER'
        });

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
                // This will trigger the notification via createEvent
                await this.createEvent(tournamentId, 'COMMENTARY', commentary, matchId);
            }
        } catch (error) {
            console.error("Error triggering commentary:", error);
        }
    }
}
