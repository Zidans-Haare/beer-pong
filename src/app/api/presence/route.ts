import { NextRequest, NextResponse } from 'next/server';
import { heartbeat, getOnlineCount } from '@/lib/presence';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const sessionId = req.cookies.get('presence_id')?.value;
    if (sessionId) heartbeat(sessionId);
    return NextResponse.json({ count: getOnlineCount() });
}

export async function GET() {
    return NextResponse.json({ count: getOnlineCount() });
}
