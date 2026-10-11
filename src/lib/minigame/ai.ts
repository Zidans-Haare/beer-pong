// Gegner des Minispiels: trifft und verwirft zufällig, wie ein echter Mitspieler.
// Alles hängt am übergebenen Zufall, damit es sich testen lässt.

import { islandsOf, oneOneTwoSlots, canRearrange, type Game, type Side, type ThrowResult, type Cup } from '@/lib/minigame/engine';

export type Rng = () => number;
export type Difficulty = 'easy' | 'normal' | 'hard';

// Wie oft ein Ball nach dem Rand so weit zurückrollt, dass er über die Mitte des Tisches kommt (Trickshot)
export const ROLL_BACK_CHANCE = 0.2;

export const DIFFICULTIES: Record<Difficulty, { hit: number; sway: number; swat: number; bomb: number; island: number }> = {
    // hit: Trefferchance eines Wurfs bei vollem Tisch; sway: Handzittern des Spielers (Pixel);
    // swat: Chance, dass der Gegner einen Aufpraller des Spielers wegschlägt;
    // bomb: wie oft er nach einem Treffer denselben Becher noch einmal anvisiert; island: wie gezielt er Inseln sucht
    easy: { hit: 0.16, sway: 14, swat: 0.1, bomb: 0.2, island: 0.4 },
    normal: { hit: 0.34, sway: 34, swat: 0.3, bomb: 0.5, island: 0.7 },
    hard: { hit: 0.58, sway: 56, swat: 0.55, bomb: 0.8, island: 0.95 },
};

export interface AiPlan {
    cupId: number;
    islandCall: boolean;
    bounce: boolean;
    // Ergebnis, wenn der Spieler nichts dazwischen tut (Aufpraller kann er noch wegschlagen)
    result: ThrowResult;
}

// Je weniger Becher stehen, desto schwerer wird es
export const hitChance = (difficulty: Difficulty, cupsLeft: number, size = 1) =>
    Math.min(0.9, Math.max(0.1, DIFFICULTIES[difficulty].hit * (1 - (10 - Math.min(10, cupsLeft)) * 0.03) * (1 + (size - 1) * 0.6)));

// Aufpraller gibt es nur im Spiel gegen den Rechner: Im Duell könnte niemand wegschlagen (allowBounce = false)
export function planAiThrow(game: Game, rng: Rng, difficulty: Difficulty, lastHit: number | null = null, allowBounce = true): AiPlan | null {
    const targets = game.cups.me;
    if (targets.length === 0) return null;

    // zweiter Wurf: oft auf denselben Becher, in der Hoffnung auf eine Bombe
    let target: Cup | undefined = lastHit !== null && rng() < DIFFICULTIES[difficulty].bomb ? targets.find(c => c.id === lastHit) : undefined;
    const islands = islandsOf(targets, game.size);
    let islandCall = false;
    if (!target && islands.length > 0 && rng() < DIFFICULTIES[difficulty].island) { target = islands[Math.floor(rng() * islands.length)]; islandCall = game.islandsLeft.opp > 0 && rng() < 0.6; }
    // sonst bevorzugt ein vorderer Becher
    if (!target) {
        const front = [...targets].sort((a, b) => b.v - a.v).slice(0, Math.max(3, Math.ceil(targets.length / 2)));
        target = front[Math.floor(rng() * front.length)];
    }
    if (islandCall && !islands.some(c => c.id === target!.id)) islandCall = false;

    const bounce = allowBounce && rng() < 0.14;
    const chance = hitChance(difficulty, targets.length, game.size) * (bounce ? 0.7 : 1);
    const roll = rng();
    let result: ThrowResult;
    if (roll < chance) result = { kind: 'hit', cupId: target.id, bounce };
    else if (roll < chance + 0.28) result = { kind: 'rim', rolledBack: rng() < ROLL_BACK_CHANCE };
    else result = { kind: 'miss' };
    return { cupId: target.id, islandCall, bounce, result };
}

// Trickshot des Gegners: schwerer als ein normaler Wurf
export function planAiTrick(game: Game, rng: Rng, difficulty: Difficulty): ThrowResult {
    const targets = game.cups.me;
    if (targets.length === 0) return { kind: 'miss' };
    return rng() < hitChance(difficulty, targets.length, game.size) * 0.5
        ? { kind: 'hit', cupId: targets[Math.floor(rng() * targets.length)].id, bounce: false }
        : { kind: 'miss' };
}

// Der Gegner darf die Becher des Spielers stellen, wenn nur noch vier stehen, und nimmt dann immer die Anordnung
// 1-1-2 (Spitze, Mitte der dritten Reihe, die zwei mittleren der letzten Reihe). Liefert die Plätze, auf die die Becher kommen.
export function aiRearrangeSlots(game: Game, rng: Rng): number[] | null {
    if (!canRearrange(game, 'opp')) return null;
    return oneOneTwoSlots(game.cups.me.length, rng() < 0.5);
}

// Wegschlagen eines Aufprallers des Spielers; dabei kann der Gegner eigene Becher umwerfen
export function aiSwat(game: Game, rng: Rng, difficulty: Difficulty): { swat: boolean; ownCupLost: number | null } {
    if (rng() >= DIFFICULTIES[difficulty].swat) return { swat: false, ownCupLost: null };
    const cups = game.cups.opp;
    // ein Missgeschick beim Wegschlagen ist selten
    const accident = cups.length > 0 && rng() < 0.08;
    return { swat: true, ownCupLost: accident ? cups[Math.floor(rng() * cups.length)].id : null };
}

// Schnick, Schnack, Schnuck
export function aiHand(rng: Rng): 'rock' | 'paper' | 'scissors' {
    const roll = rng();
    return roll < 1 / 3 ? 'rock' : roll < 2 / 3 ? 'paper' : 'scissors';
}
