import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// POST /api/demo-reset
// Triggers the demo seed script to reset the database.
// Protected by DEMO_RESET_SECRET header.
export async function POST(request: Request) {
    if (!isDemoMode) {
        return NextResponse.json({ error: 'Not in demo mode.' }, { status: 403 });
    }

    const secret = request.headers.get('x-demo-reset-secret');
    if (!secret || secret !== process.env.DEMO_RESET_SECRET) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    try {
        await execFileAsync('npx', ['tsx', 'prisma/seed-demo.ts'], {
            cwd: process.cwd(),
            timeout: 30_000,
        });
        return NextResponse.json({ success: true, message: 'Demo database reset.' });
    } catch (error) {
        console.error('Demo reset failed:', error);
        return NextResponse.json({ error: 'Reset failed.' }, { status: 500 });
    }
}
