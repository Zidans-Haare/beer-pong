// In-memory presence store. Works in a single-process Next.js/PM2 setup.
const sessions = new Map<string, number>(); // sessionId -> lastSeen timestamp

const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

function cleanup() {
    const now = Date.now();
    for (const [id, lastSeen] of sessions) {
        if (now - lastSeen > TIMEOUT_MS) sessions.delete(id);
    }
}

export function heartbeat(sessionId: string) {
    cleanup();
    sessions.set(sessionId, Date.now());
}

export function getOnlineCount(): number {
    cleanup();
    return sessions.size;
}
