import { spawn } from 'child_process';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

const DEPLOY_SECRET = process.env.DEPLOY_SECRET;

/**
 * POST /api/deploy
 *
 * Triggers a git pull + rebuild + pm2 restart on the server.
 * Called automatically by a GitHub webhook on push to main.
 *
 * Auth options (either works):
 *   - Authorization: Bearer <DEPLOY_SECRET>
 *   - GitHub webhook with secret = DEPLOY_SECRET  (X-Hub-Signature-256)
 */
export async function POST(req: NextRequest) {
    if (!DEPLOY_SECRET) {
        return NextResponse.json({ error: 'DEPLOY_SECRET not configured' }, { status: 503 });
    }

    const authorized = await verifyRequest(req, DEPLOY_SECRET);
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appDir = path.resolve(process.cwd());
    const updateScript = path.join(appDir, 'scripts', 'update.sh');

    // Spawn detached — response is sent before pm2 restarts the process
    const child = spawn('bash', [updateScript], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, APP_DIR: appDir },
    });
    child.unref();

    return NextResponse.json({ message: 'Deploy started' }, { status: 202 });
}

async function verifyRequest(req: NextRequest, secret: string): Promise<boolean> {
    // GitHub webhook signature
    const ghSig = req.headers.get('x-hub-signature-256');
    if (ghSig) {
        const body = await req.text();
        const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
        try {
            return timingSafeEqual(Buffer.from(ghSig), Buffer.from(expected));
        } catch {
            return false;
        }
    }

    // Simple Bearer token
    const auth = req.headers.get('authorization');
    if (auth) {
        try {
            return timingSafeEqual(Buffer.from(auth), Buffer.from(`Bearer ${secret}`));
        } catch {
            return false;
        }
    }

    return false;
}
