// Regeln des Bier-Pong-Minispiels. Reine Logik ohne Zeichnen und ohne Zufall im Inneren:
// Würfe kommen als Ergebnis herein (Zielen und Würfeln machen KI und Oberfläche),
// die Engine wendet die Hausregeln darauf an und meldet, was passiert ist.


export type Side = 'me' | 'opp';
export const other = (side: Side): Side => (side === 'me' ? 'opp' : 'me');

export interface Cup { id: number; u: number; v: number }
export type Hand = 'rock' | 'paper' | 'scissors';

// Pro Runde zwei Würfe
export const THROWS_PER_ROUND = 2;
export const START_CUPS = 10;
// Verlängerung: die vordersten drei Becher (Spitze und die Reihe dahinter) werden wieder aufgestellt
export const OVERTIME_CUPS = 3;
const FRONT_CUPS_FROM = START_CUPS - OVERTIME_CUPS;
// Ab so vielen Bechern darf man die eigenen umstellen
export const REARRANGE_MAX = 4;
// Der mittlere Becher der dritten Reihe von der Spitze aus (Position 5 im Zehnerdreieck)
export const AUSZIEH_CUP = 5;
// Bechergröße: klein (wie bisher), mittel, groß. Größere Becher stehen weiter auseinander und sind leichter zu treffen.
export const CUP_SIZES = { small: 1, medium: 1.25, large: 1.5 } as const;
export type CupSize = keyof typeof CUP_SIZES;
// Pro Spiel darf jeder höchstens zweimal "Island" ansagen, auch in Nachziehen und Verlängerung
export const ISLANDS_PER_GAME = 2;
// Ein Becher steht allein, wenn der nächste mindestens so weit weg ist (in Becherbreiten, Mitte zu Mitte).
// Im Dreieck sind Nachbarn 1,0 entfernt; fehlt eine ganze Reihe dazwischen, sind es 1,73.
export const ISLAND_DISTANCE = 1.6

export type ThrowResult =
    | { kind: 'miss' }
    | { kind: 'rim'; rolledBack: boolean }
    | { kind: 'hit'; cupId: number; bounce: boolean }
    // Aufpraller, den der Gegner weggeschlagen hat; `ownCupLost` ist ein dabei umgeworfener eigener Becher
    | { kind: 'blocked'; cupId: number; ownCupLost: number | null };

export interface RoundHit { cupId: number; bounce: boolean; island: boolean; remove: number }

export type GameEvent =
    | { type: 'hit'; side: Side; cupId: number; bounce: boolean; island: boolean }
    | { type: 'miss'; side: Side }
    | { type: 'rim'; side: Side; rolledBack: boolean }
    | { type: 'blocked'; side: Side; cupId: number; ownCupLost: number | null }
    | { type: 'trick'; side: Side }
    | { type: 'strip'; side: Side }
    | { type: 'dress'; side: Side }
    | { type: 'bomb'; side: Side; cupId: number }
    | { type: 'remove'; side: Side; ids: number[]; reason: 'hit' | 'bounce' | 'island' | 'bomb' | 'islandStreak' | 'accident' }
    | { type: 'ballsBack'; side: Side }
    | { type: 'catchUp'; side: Side }
    | { type: 'overtime' }
    | { type: 'over'; winner: Side; nakedMile: Side | null };

export interface Game {
    starter: Side;
    turn: Side;
    // verbleibende Würfe der laufenden Runde
    throwsLeft: number;
    // Treffer der laufenden Runde; die Becher bleiben bis zum Rundenende stehen
    roundHits: RoundHit[];
    cups: Record<Side, Cup[]>;
    // Maßstab der Becher (1, 1,25 oder 1,5)
    size: number;
    // nach einem Abpraller über die Mitte zurück darf der Werfer einen Trickshot versuchen
    trickPending: boolean;
    // Nachziehen: der Spieler, der nicht begonnen hat, hat nach dem letzten Becher des Beginners noch einen Zug
    catchUp: boolean;
    // noch verfügbare Island-Ansagen und ob schon umgestellt wurde (jeweils einmal pro Spiel)
    islandsLeft: Record<Side, number>;
    rearranged: Record<Side, boolean>;
    firstHitDone: boolean;
    stripped: Side | null;
    // getroffene Becher im ganzen Spiel
    hits: Record<Side, number>;
    islandStreak: Record<Side, number>;
    overtime: number;
    winner: Side | null;
    nakedMile: Side | null;
}

// Zehnerdreieck einer Seite für eine Bechergröße. Reihe 0 steht an der Tischkante, die Spitze (Reihe 3) zur Mitte.
export function formation(side: Side, size = 1): Cup[] {
    const cups: Cup[] = [];
    let id = 0;
    [4, 3, 2, 1].forEach((count, row) => {
        for (let i = 0; i < count; i++) {
            const step = 0.066 * size;
            cups.push({ id: id++, u: (i - (count - 1) / 2) * 0.235 * size, v: side === 'me' ? 0.055 + row * step : 0.945 - row * step });
        }
    });
    return cups;
}

// Reihen von der Spitze aus gelesen: 1, 2, 3, 4 Becher
export function newGame(starter: Side, size = 1): Game {
    return {
        starter, turn: starter, throwsLeft: THROWS_PER_ROUND, roundHits: [],
        cups: { me: formation('me', size), opp: formation('opp', size) }, size,
        trickPending: false, catchUp: false, firstHitDone: false, stripped: null,
        islandsLeft: { me: ISLANDS_PER_GAME, opp: ISLANDS_PER_GAME }, rearranged: { me: false, opp: false },
        hits: { me: 0, opp: 0 }, islandStreak: { me: 0, opp: 0 },
        overtime: 0, winner: null, nakedMile: null,
    };
}

// ---- Schnick, Schnack, Schnuck ----
const BEATS: Record<Hand, Hand> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
// 'me' gewinnt, 'opp' gewinnt oder null bei Gleichstand
export function rockPaperScissors(mine: Hand, theirs: Hand): Side | null {
    if (mine === theirs) return null;
    return BEATS[mine] === theirs ? 'me' : 'opp';
}

// ---- Geometrie in Becherbreiten ----
// Quer und längs sind auf dem Tisch verschieden gedehnt. Im Dreieck liegen Nachbarn in der Reihe 0,235 (u) und
// benachbarte Reihen 0,066 (v) auseinander und berühren sich mit genau einer Becherbreite Abstand.
function spot(cup: { u: number; v: number }, size: number) {
    return { x: cup.u / (0.235 * size), y: (cup.v / (0.066 * size)) * 0.866 };
}

// Abstand zweier Becher, Mitte zu Mitte, in Becherbreiten
export function cupDistance(a: { u: number; v: number }, b: { u: number; v: number }, size = 1): number {
    const pa = spot(a, size), pb = spot(b, size);
    return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

// Ein Becher steht allein, wenn um ihn herum nichts mehr steht (mindestens zwei Becher auf dem Tisch)
export function isIsland(cups: Cup[], cup: Cup, size = 1): boolean {
    return cups.length >= 2 && cups.some(c => c.id === cup.id) && !cups.some(c => c.id !== cup.id && cupDistance(c, cup, size) < ISLAND_DISTANCE);
}

export const islandsOf = (cups: Cup[], size = 1): Cup[] => cups.filter(c => isIsland(cups, c, size));

// Becher, die man nach einem Treffer zusätzlich wegstellt: die nächsten des Gegners
function nearest(cups: Cup[], from: Cup, count: number, exclude: Set<number>, size: number): Cup[] {
    return cups
        .filter(c => c.id !== from.id && !exclude.has(c.id))
        .sort((a, b) => cupDistance(from, a, size) - cupDistance(from, b, size))
        .slice(0, count);
}

// ---- Würfe ----
export interface ThrowOptions {
    // "Island!" angesagt: gilt nur, wenn der anvisierte Becher wirklich allein steht
    islandCalled?: boolean;
    // Bonuswurf nach einem Abpraller über die Mitte; verbraucht keinen der zwei Würfe
    trick?: boolean;
}

export function canTrick(game: Game): boolean { return game.trickPending && !game.winner; }

export function applyThrow(game: Game, result: ThrowResult, options: ThrowOptions = {}): { game: Game; events: GameEvent[] } {
    const g: Game = structuredClone(game);
    const events: GameEvent[] = [];
    const side = g.turn, defender = other(side);
    if (g.winner) return { game: g, events };

    if (options.trick) { g.trickPending = false; events.push({ type: 'trick', side }); }
    else { g.throwsLeft = Math.max(0, g.throwsLeft - 1); g.trickPending = false; }

    // "Island" gilt nur, wenn es noch eine Ansage gibt und auf dem Tisch wirklich ein Becher allein steht
    const islandCall = !!options.islandCalled && g.islandsLeft[side] > 0 && islandsOf(g.cups[defender], g.size).length > 0;
    if (islandCall) g.islandsLeft[side]--;
    if (result.kind === 'hit') {
        const cup = g.cups[defender].find(c => c.id === result.cupId);
        if (!cup) throw new Error('Becher gibt es nicht mehr');
        const island = islandCall && isIsland(g.cups[defender], cup, g.size);
        let remove = 1;
        if (result.bounce) remove = 2;
        if (island) {
            g.islandStreak[side]++;
            // zwei Island-Treffer mit direkt aufeinanderfolgenden Würfen: sechs Becher
            if (g.islandStreak[side] >= 2) { remove = Math.max(remove, 6); g.islandStreak[side] = 0; }
            else remove = Math.max(remove, 2);
        } else g.islandStreak[side] = 0;
        g.roundHits.push({ cupId: cup.id, bounce: result.bounce, island, remove });
        g.hits[side]++;
        events.push({ type: 'hit', side, cupId: cup.id, bounce: result.bounce, island });

        // Ausziehbecher: der allererste Treffer im Spiel, und zwar der mittlere Becher der dritten Reihe
        if (!g.firstHitDone) {
            g.firstHitDone = true;
            if (cup.id === AUSZIEH_CUP && g.overtime === 0) { g.stripped = side; events.push({ type: 'strip', side }); }
        } else if (g.stripped === side) {
            g.stripped = null; events.push({ type: 'dress', side });
        }
    } else {
        // jeder Wurf, der kein Island trifft, unterbricht die Serie
        g.islandStreak[side] = 0;
        if (result.kind === 'miss') events.push({ type: 'miss', side });
        else if (result.kind === 'rim') {
            events.push({ type: 'rim', side, rolledBack: result.rolledBack });
            if (result.rolledBack && !options.trick) g.trickPending = true;
        } else {
            events.push({ type: 'blocked', side, cupId: result.cupId, ownCupLost: result.ownCupLost });
            // Wer beim Wegschlagen eigene Becher umwirft, bekommt sie nicht zurück
            if (result.ownCupLost !== null) {
                g.cups[defender] = g.cups[defender].filter(c => c.id !== result.ownCupLost);
                events.push({ type: 'remove', side: defender, ids: [result.ownCupLost], reason: 'accident' });
            }
        }
    }
    return { game: g, events };
}

export function skipTrick(game: Game): Game { return { ...game, trickPending: false }; }

// Die Runde ist zu Ende, wenn beide Würfe gefallen sind und kein Trickshot mehr offen ist
export const roundOver = (game: Game): boolean => game.throwsLeft === 0 && !game.trickPending;

// ---- Rundenende ----
export function resolveRound(game: Game): { game: Game; events: GameEvent[] } {
    const g: Game = structuredClone(game);
    const events: GameEvent[] = [];
    const side = g.turn, defender = other(side);

    // gleiche Becher zweimal getroffen = Bombe: drei Becher
    const byCup = new Map<number, RoundHit[]>();
    for (const hit of g.roundHits) byCup.set(hit.cupId, [...(byCup.get(hit.cupId) ?? []), hit]);
    const doomed = new Set<number>(byCup.keys());
    const removed: { ids: number[]; reason: 'hit' | 'bounce' | 'island' | 'bomb' | 'islandStreak' }[] = [];
    for (const [cupId, hits] of byCup) {
        const cup = g.cups[defender].find(c => c.id === cupId);
        if (!cup) continue;
        const bomb = hits.length >= 2;
        const need = Math.max(...hits.map(h => h.remove), bomb ? 3 : 1);
        const reason = bomb && need === 3 ? 'bomb' : hits.some(h => h.remove >= 6) ? 'islandStreak' : hits.some(h => h.island) ? 'island' : hits.some(h => h.bounce) ? 'bounce' : 'hit';
        const extra = nearest(g.cups[defender], cup, need - 1, doomed, g.size);
        extra.forEach(c => doomed.add(c.id));
        if (bomb) events.push({ type: 'bomb', side, cupId });
        removed.push({ ids: [cupId, ...extra.map(c => c.id)], reason });
    }
    for (const r of removed) events.push({ type: 'remove', side: defender, ids: r.ids, reason: r.reason });
    g.cups[defender] = g.cups[defender].filter(c => !doomed.has(c.id));

    // Balls back: zwei versenkte Bälle in der Runde, also darf der Werfer noch einmal zwei werfen. Es zählt jeder
    // Ball, auch eine Bombe (zwei Bälle im selben Becher) und ein Treffer per Trickshot.
    const ballsBack = g.roundHits.length >= THROWS_PER_ROUND;
    g.roundHits = [];
    g.throwsLeft = THROWS_PER_ROUND;
    g.trickPending = false;

    const cleared = g.cups[defender].length === 0;
    const finish = (winner: Side) => {
        g.winner = winner;
        const loser = other(winner);
        // ein ganzes Spiel ohne einen Treffer verloren: nackte Meile
        g.nakedMile = g.hits[loser] === 0 ? loser : null;
        events.push({ type: 'over', winner, nakedMile: g.nakedMile });
    };

    if (g.catchUp) {
        // Nachziehen gibt es nur einmal: ein Zug, der sich nur mit Balls back verlängert
        if (cleared) {
            // beide haben alles getroffen: Verlängerung, die vordersten drei Becher pro Seite werden neu aufgestellt
            g.overtime++;
            g.catchUp = false;
            g.turn = g.starter;
            g.cups.me = formation('me', g.size).filter(c => c.id >= FRONT_CUPS_FROM);
            g.cups.opp = formation('opp', g.size).filter(c => c.id >= FRONT_CUPS_FROM);
            events.push({ type: 'overtime' });
        } else if (ballsBack) {
            events.push({ type: 'ballsBack', side });
        } else finish(g.starter);
    } else if (cleared) {
        if (side === g.starter) {
            // der Beginner hat den letzten Becher getroffen: der andere zieht noch einmal nach
            g.catchUp = true;
            g.turn = defender;
            events.push({ type: 'catchUp', side: defender });
        } else finish(side);
    } else if (ballsBack) {
        events.push({ type: 'ballsBack', side });
    } else {
        g.turn = defender;
    }
    return { game: g, events };
}

// ---- Becher umstellen ----
// Wer wirft, darf die Becher stellen, die er treffen muss, sobald auf der Gegenseite nur noch vier stehen. `by` ist der
// Werfer, umgestellt werden die Becher der Gegenseite. Genau einmal pro Spiel, nur zu Beginn einer eigenen Runde
// (nicht mitten in der Runde, denn getroffene Becher stehen bis zum Rundenende noch) und nicht beim Nachziehen.
// Gestellt wird nur auf die zehn Plätze des Zehnerdreiecks, nicht frei auf den Tisch.
export const canRearrange = (game: Game, by: Side): boolean => {
    const targets = game.cups[other(by)].length;
    return !game.winner && !game.catchUp && !game.rearranged[by] && game.throwsLeft === THROWS_PER_ROUND && game.roundHits.length === 0
        && targets >= 1 && targets <= REARRANGE_MAX;
};

// Das Umstellen ist abgeschlossen; danach gibt es kein zweites Mal
export function finishRearranging(game: Game, by: Side): Game {
    return { ...game, rearranged: { ...game.rearranged, [by]: true } };
}

// Die zehn Plätze einer Seite (Positionen des vollen Dreiecks). Platz i ist die Position von Becher i beim Aufbau.
export const slotsOf = (side: Side, size = 1): Cup[] => formation(side, size);

const SAME_SPOT = 1e-6;
const atSlot = (cup: { u: number; v: number }, slot: Cup) => Math.abs(cup.u - slot.u) < SAME_SPOT && Math.abs(cup.v - slot.v) < SAME_SPOT;

// Nummer des Platzes, auf dem ein Becher steht (oder null)
export function slotIndexOf(game: Game, side: Side, cup: { u: number; v: number }): number | null {
    const slot = slotsOf(side, game.size).find(s => atSlot(cup, s));
    return slot ? slot.id : null;
}

// Plätze einer Seite, auf denen gerade kein Becher steht
export function freeSlots(game: Game, side: Side): number[] {
    return slotsOf(side, game.size).filter(slot => !game.cups[side].some(c => atSlot(c, slot))).map(slot => slot.id);
}

// Stellt einen Becher der Gegenseite auf einen freien Platz
export function moveCup(game: Game, by: Side, cupId: number, slot: number): Game {
    if (!canRearrangeNow(game, by)) return game;
    const side = other(by);
    const target = slotsOf(side, game.size).find(s => s.id === slot);
    if (!target || !freeSlots(game, side).includes(slot)) return game;
    if (!game.cups[side].some(c => c.id === cupId)) return game;
    return { ...game, cups: { ...game.cups, [side]: game.cups[side].map(c => (c.id === cupId ? { id: c.id, u: target.u, v: target.v } : c)) } };
}

// Während des Umstellens (Runde läuft noch nicht) darf weiter verschoben werden; die Bedingungen prüft canRearrange
// zu Beginn. Hier zählt nur, dass noch nicht abgeschlossen wurde und das Spiel läuft.
const canRearrangeNow = (game: Game, by: Side) => !game.winner && !game.catchUp && !game.rearranged[by] && game.throwsLeft === THROWS_PER_ROUND && game.roundHits.length === 0;

// Die Anordnung 1-1-2 des Computers als Plätze: die Spitze, ein Becher dahinter und zwei in der Reihe danach. Alle
// berühren sich, es entsteht kein Island. Bei weniger Bechern nimmt er die ersten davon. `mirror` spiegelt links/rechts.
export function oneOneTwoSlots(count: number, mirror: boolean): number[] {
    const left = [9, 7, 4, 5];
    const right = [9, 8, 6, 5];
    return (mirror ? right : left).slice(0, Math.max(1, Math.min(4, count)));
}

// Stellt die Becher der Gegenseite auf einmal auf die angegebenen Plätze um (Computer)
export function rearrange(game: Game, by: Side, slots: number[]): Game {
    if (!canRearrange(game, by)) return game;
    const side = other(by);
    const all = slotsOf(side, game.size);
    const cups = game.cups[side].map((c, i) => {
        const slot = all.find(s => s.id === slots[i]);
        return slot ? { id: c.id, u: slot.u, v: slot.v } : c;
    });
    return { ...game, cups: { ...game.cups, [side]: cups }, rearranged: { ...game.rearranged, [by]: true } };
}
