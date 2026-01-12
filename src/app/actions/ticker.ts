'use server';

import { TickerService } from "@/lib/services/TickerService";

export async function getTickerEvents(tournamentId: string) {
    try {
        const events = await TickerService.getEvents(tournamentId);
        return { success: true, events };
    } catch (error) {
        console.error("Failed to fetch ticker events:", error);
        return { success: false, events: [] };
    }
}
