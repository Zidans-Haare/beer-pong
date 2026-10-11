// Aufzeichnung der Würfe eines Herausforderers. Wer das Duell annimmt, spielt gegen genau diese Würfe,
// Runde für Runde, als säße der andere mit am Tisch.

import type { ThrowResult } from '@/lib/minigame/engine';

export interface ReplayThrow {
    // Runde, in der geworfen wurde (0 = erste)
    r: number;
    result: ThrowResult;
    island: boolean;
    trick: boolean;
}

const MAX_THROWS = 400;

function validResult(value: unknown): value is ThrowResult {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (v.kind === 'miss') return true;
    if (v.kind === 'rim') return typeof v.rolledBack === 'boolean';
    if (v.kind === 'hit') return Number.isInteger(v.cupId) && typeof v.bounce === 'boolean';
    return false;
}

// Liest eine Aufzeichnung aus JSON; Ungültiges wird verworfen. Weggeschlagene Aufpraller zählen als Treffer,
// der Nachziehende darf sie selbst wegschlagen.
export function parseReplay(json: string | null | undefined): ReplayThrow[] | null {
    if (!json) return null;
    try {
        const raw = JSON.parse(json) as unknown;
        if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_THROWS) return null;
        const out: ReplayThrow[] = [];
        for (const item of raw) {
            if (!item || typeof item !== 'object') return null;
            const t = item as Record<string, unknown>;
            if (!Number.isInteger(t.r) || (t.r as number) < 0 || (t.r as number) > 200 || !validResult(t.result)) return null;
            out.push({ r: t.r as number, result: t.result, island: t.island === true, trick: t.trick === true });
        }
        return out;
    } catch {
        return null;
    }
}

export const roundsOf = (replay: ReplayThrow[]): number => (replay.length ? Math.max(...replay.map(t => t.r)) + 1 : 0);
export const hitsOf = (replay: ReplayThrow[]): number => replay.filter(t => t.result.kind === 'hit').length;

// Würfe einer Runde in der aufgezeichneten Reihenfolge
export const throwsOfRound = (replay: ReplayThrow[], round: number): ReplayThrow[] => replay.filter(t => t.r === round);
