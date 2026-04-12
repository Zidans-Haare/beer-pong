/**
 * In-memory WebRTC signaling store.
 * Works for single-server deployments (local tournament setup).
 */
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

interface StreamState {
    offer: RTCSessionDescriptionInit | null;
    answer: RTCSessionDescriptionInit | null;
    offerCandidates: RTCIceCandidateInit[];
    answerCandidates: RTCIceCandidateInit[];
    answerVersion: number; // increments each time TV sends a new answer
    updatedAt: number;
}

// Use globalThis so the store survives Next.js hot-reloads
const g = globalThis as any;
if (!g.__streamStore) g.__streamStore = new Map<string, StreamState>();
const store: Map<string, StreamState> = g.__streamStore;

// Cleanup: remove inactive streams (> 2h old)
function cleanupStore() {
    const now = Date.now();
    const TTL = 2 * 60 * 60 * 1000; // 2 hours
    for (const [id, state] of store.entries()) {
        if (now - state.updatedAt > TTL) {
            store.delete(id);
        }
    }
}

async function checkAccess(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) return false;

    // Admin override
    // @ts-ignore
    if (session.user.email === process.env.ADMIN_EMAIL) return true;

    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { participants: true }
    });

    if (!tournament) return false;

    const isHost = tournament.hostId === session.user.id;
    const isParticipant = tournament.participants.some((p: any) => p.player?.userId === session.user.id);

    return isHost || isParticipant;
}

function getOrCreate(id: string): StreamState {
    cleanupStore(); // minor cleanup on every getOrCreate call
    if (!store.has(id)) {
        store.set(id, { offer: null, answer: null, offerCandidates: [], answerCandidates: [], answerVersion: 0, updatedAt: Date.now() });
    }
    return store.get(id)!;
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ tournamentId: string }> }
) {
    const { tournamentId } = await params;
    // Public read — SDP/ICE data is not sensitive and TV screens are unauthenticated
    const state = getOrCreate(tournamentId);
    return Response.json(state);
}

// Actions that require auth (broadcaster side)
const BROADCASTER_ACTIONS = new Set(['set-offer', 'add-offer-candidate', 'clear']);

export async function POST(
    req: Request,
    { params }: { params: Promise<{ tournamentId: string }> }
) {
    const { tournamentId } = await params;
    const body = await req.json();

    // Only broadcaster actions need auth; TV responses (set-answer, add-answer-candidate) are public
    if (BROADCASTER_ACTIONS.has(body.action)) {
        if (!(await checkAccess(tournamentId))) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const state = getOrCreate(tournamentId);

    switch (body.action) {
        case 'set-offer':
            state.offer = body.data;
            state.answer = null;
            state.offerCandidates = [];
            state.answerCandidates = [];
            break;
        case 'set-answer':
            state.answer = body.data;
            state.answerCandidates = []; // clear old answer candidates for this new attempt
            state.answerVersion = (state.answerVersion ?? 0) + 1;
            break;
        case 'add-offer-candidate':
            state.offerCandidates.push(body.data);
            break;
        case 'add-answer-candidate':
            state.answerCandidates.push(body.data);
            break;
        case 'clear':
            store.delete(tournamentId);
            break;
        default:
            return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    state.updatedAt = Date.now();
    return Response.json({ ok: true });
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ tournamentId: string }> }
) {
    const { tournamentId } = await params;

    // Auth check
    if (!(await checkAccess(tournamentId))) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    store.delete(tournamentId);
    return Response.json({ ok: true });
}
