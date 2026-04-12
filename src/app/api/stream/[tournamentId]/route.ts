/**
 * In-memory WebRTC signaling store.
 * Works for single-server deployments (local tournament setup).
 */

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

function getOrCreate(id: string): StreamState {
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
    const state = getOrCreate(tournamentId);
    return Response.json(state);
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ tournamentId: string }> }
) {
    const { tournamentId } = await params;
    const body = await req.json();
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
    store.delete(tournamentId);
    return Response.json({ ok: true });
}
