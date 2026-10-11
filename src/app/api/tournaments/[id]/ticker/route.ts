import { NextResponse } from 'next/server';
import { TickerService } from '@/lib/services/TickerService';

export const dynamic = 'force-dynamic';

// Ticker-Ereignisse eines Turniers. GET-Route statt Server-Aktion, damit die Abfrage alle paar
// Sekunden keine Seitenwechsel aufhält.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const events = await TickerService.getEvents(id);
        return NextResponse.json({ success: true, events }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Failed to fetch ticker events:', error);
        return NextResponse.json({ success: false, events: [] });
    }
}
