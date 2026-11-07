import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Fehler aus dem Browser (Skript-Fehler, abgelehnte Promises), damit sich kurze Abstürze beim Start auch ohne Konsole am Handy finden lassen.
// Landet im Fehlerprotokoll des Servers (pm2 logs). Kleine Texte, begrenzte Menge pro Minute.
const MAX_BYTES = 4000;
const PER_MINUTE = 60;
let windowStart = 0;
let count = 0;

export async function POST(request: Request) {
    const now = Date.now();
    if (now - windowStart > 60_000) { windowStart = now; count = 0; }
    if (++count > PER_MINUTE) return new NextResponse(null, { status: 204 });
    try {
        const body = (await request.text()).slice(0, MAX_BYTES);
        console.error('[client-error]', body.replace(/\s+/g, ' '));
    } catch { /* egal */ }
    return new NextResponse(null, { status: 204 });
}
