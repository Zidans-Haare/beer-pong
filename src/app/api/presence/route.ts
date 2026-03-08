import { NextRequest, NextResponse } from 'next/server';
import { heartbeat, getOnlineCount, isAlone } from '@/lib/presence';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await auth();
    // Use user ID if logged in, otherwise fall back to cookie (guests)
    const sessionId = session?.user?.id ?? req.cookies.get('presence_id')?.value;
    if (sessionId) heartbeat(sessionId);
    const count = getOnlineCount();
    const alone = sessionId ? isAlone(sessionId) : false;
    return NextResponse.json({ count, alone });
}

export async function GET() {
    return NextResponse.json({ count: getOnlineCount() });
}
