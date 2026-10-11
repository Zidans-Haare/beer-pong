import { describe, it, expect } from 'vitest';
import {
    newGame, applyThrow, resolveRound, roundOver, rockPaperScissors, isIsland, islandsOf, canRearrange, moveCup,
    rearrange, finishRearranging, oneOneTwoSlots, slotsOf, freeSlots, slotIndexOf, skipTrick, AUSZIEH_CUP, type Game, type ThrowResult, type Side,
} from './engine';

const hit = (cupId: number, bounce = false): ThrowResult => ({ kind: 'hit', cupId, bounce });
const miss: ThrowResult = { kind: 'miss' };

// Spielt eine Runde mit den beiden angegebenen Würfen durch
function round(game: Game, first: ThrowResult, second: ThrowResult, options: { island?: boolean[] } = {}) {
    let g = game;
    const events = [];
    for (const [i, result] of [first, second].entries()) {
        const out = applyThrow(g, result, { islandCalled: options.island?.[i] });
        g = out.game; events.push(...out.events);
    }
    const resolved = resolveRound(g);
    return { game: resolved.game, events: [...events, ...resolved.events] };
}
const withCups = (game: Game, side: Side, ids: number[]): Game => ({ ...game, cups: { ...game.cups, [side]: game.cups[side].filter(c => ids.includes(c.id)) } });

describe('Schnick, Schnack, Schnuck', () => {
    it('Stein schlägt Schere, Schere schlägt Papier, Papier schlägt Stein', () => {
        expect(rockPaperScissors('rock', 'scissors')).toBe('me');
        expect(rockPaperScissors('scissors', 'paper')).toBe('me');
        expect(rockPaperScissors('paper', 'rock')).toBe('me');
        expect(rockPaperScissors('rock', 'paper')).toBe('opp');
        expect(rockPaperScissors('paper', 'paper')).toBeNull();
    });
});

describe('Runden und Würfe', () => {
    it('beginnt mit zehn Bechern je Seite und zwei Würfen', () => {
        const g = newGame('me');
        expect(g.cups.me).toHaveLength(10);
        expect(g.cups.opp).toHaveLength(10);
        expect(g.throwsLeft).toBe(2);
        expect(g.turn).toBe('me');
    });

    it('entfernt getroffene Becher erst am Rundenende und wechselt dann den Werfer', () => {
        let g = newGame('me');
        g = applyThrow(g, hit(9)).game;
        expect(g.cups.opp).toHaveLength(10);
        expect(roundOver(g)).toBe(false);
        g = applyThrow(g, miss).game;
        expect(roundOver(g)).toBe(true);
        g = resolveRound(g).game;
        expect(g.cups.opp.map(c => c.id)).not.toContain(9);
        expect(g.cups.opp).toHaveLength(9);
        expect(g.turn).toBe('opp');
        expect(g.throwsLeft).toBe(2);
    });

    it('zählt verfehlte Würfe nur als verbrauchten Wurf', () => {
        const { game } = round(newGame('me'), miss, { kind: 'rim', rolledBack: false });
        expect(game.cups.opp).toHaveLength(10);
        expect(game.turn).toBe('opp');
    });
});

describe('Balls back', () => {
    it('beide Bälle drin: der Werfer darf noch einmal zwei werfen', () => {
        const { game, events } = round(newGame('me'), hit(9), hit(7));
        expect(game.cups.opp).toHaveLength(8);
        expect(game.turn).toBe('me');
        expect(game.throwsLeft).toBe(2);
        expect(events.some(e => e.type === 'ballsBack')).toBe(true);
    });

    it('das geht weiter, bis er nicht mehr beide trifft', () => {
        let r = round(newGame('me'), hit(9), hit(8));
        r = round(r.game, hit(7), hit(6));
        expect(r.game.turn).toBe('me');
        expect(r.game.cups.opp).toHaveLength(6);
        r = round(r.game, hit(5), miss);
        expect(r.game.turn).toBe('opp');
        expect(r.game.cups.opp).toHaveLength(5);
    });

    it('auch eine Bombe mit beiden Bällen im selben Becher gibt Balls back', () => {
        const { game } = round(newGame('me'), hit(9), hit(9));
        expect(game.cups.opp).toHaveLength(7);
        expect(game.turn).toBe('me');
    });

    it('eine Bombe gibt Balls back, auch wenn der zweite Ball im selben Becher ein Trickshot war', () => {
        let g = applyThrow(newGame('me'), hit(9)).game;
        g = applyThrow(g, { kind: 'rim', rolledBack: true }).game;
        g = applyThrow(g, hit(9), { trick: true }).game;
        const { game, events } = resolveRound(g);
        expect(events.some(e => e.type === 'bomb')).toBe(true);
        expect(events.some(e => e.type === 'ballsBack')).toBe(true);
        expect(game.turn).toBe('me');
        expect(game.cups.opp).toHaveLength(7);
    });

    it('trifft die Bombe alle restlichen Becher, bleibt kein Balls back, aber das Spiel geht weiter', () => {
        const g = newGame('me');
        g.cups.opp = g.cups.opp.filter(c => [8, 9].includes(c.id));
        const { game, events } = round(g, hit(9), hit(9));
        expect(game.cups.opp).toHaveLength(0);
        expect(events.some(e => e.type === 'ballsBack')).toBe(false);
        expect(game.catchUp).toBe(true);
    });

    it('auch ein Treffer per Trickshot ist ein versenkter Ball', () => {
        // erster Ball knapp daneben und zurückgerollt, der Trickshot sitzt, der zweite Ball auch
        let g = applyThrow(newGame('me'), { kind: 'rim', rolledBack: true }).game;
        g = applyThrow(g, hit(9), { trick: true }).game;
        g = applyThrow(g, hit(7)).game;
        const { game, events } = resolveRound(g);
        expect(events.some(e => e.type === 'ballsBack')).toBe(true);
        expect(game.turn).toBe('me');
        expect(game.cups.opp).toHaveLength(8);
    });

    it('ein einzelner Treffer, auch mit Trickshot-Versuch daneben, gibt kein Balls back', () => {
        let g = applyThrow(newGame('me'), { kind: 'rim', rolledBack: true }).game;
        g = applyThrow(g, miss, { trick: true }).game;
        g = applyThrow(g, hit(7)).game;
        expect(resolveRound(g).game.turn).toBe('opp');
    });

    it('ein weggeschlagener Aufpraller gilt nicht als versenkt', () => {
        const { game } = round(newGame('me'), hit(9), { kind: 'blocked', cupId: 8, ownCupLost: null });
        expect(game.turn).toBe('opp');
    });
});

describe('Bombe', () => {
    it('stellt drei Becher weg, wenn beide Würfe im selben Becher landen', () => {
        const { game, events } = round(newGame('me'), hit(9), hit(9));
        expect(game.cups.opp).toHaveLength(7);
        expect(game.cups.opp.map(c => c.id)).not.toContain(9);
        expect(events.some(e => e.type === 'bomb')).toBe(true);
    });

    it('zwei verschiedene Treffer sind keine Bombe', () => {
        const { game, events } = round(newGame('me'), hit(9), hit(8));
        expect(game.cups.opp).toHaveLength(8);
        expect(events.some(e => e.type === 'bomb')).toBe(false);
    });
});

describe('Aufpraller', () => {
    it('zählt doppelt', () => {
        const { game } = round(newGame('me'), hit(9, true), miss);
        expect(game.cups.opp).toHaveLength(8);
    });
});

describe('Island', () => {
    // Becher 9 (Spitze) bleibt als einzelner Becher weit weg von der Gruppe stehen
    const base = () => {
        const g = newGame('me');
        g.cups.opp = g.cups.opp.filter(c => [0, 1, 2, 9].includes(c.id));
        g.cups.opp.find(c => c.id === 9)!.u = -0.85;
        return g;
    };

    it('erkennt einen Becher, der keinen anderen berührt', () => {
        const g = base();
        expect(islandsOf(g.cups.opp).map(c => c.id)).toEqual([9]);
        expect(isIsland(g.cups.opp, g.cups.opp.find(c => c.id === 0)!)).toBe(false);
    });

    it('ein einzelner letzter Becher ist kein Island', () => {
        const g = withCups(newGame('me'), 'opp', [9]);
        expect(islandsOf(g.cups.opp)).toEqual([]);
    });

    it('angesagt und getroffen: zwei Becher weg', () => {
        const { game } = round(base(), hit(9), miss, { island: [true, false] });
        expect(game.cups.opp).toHaveLength(2);
        // der zweite Wurf war kein Island: die Serie ist wieder bei null
        expect(game.islandStreak.me).toBe(0);
    });

    it('ohne Ansage zählt der Treffer nur einfach', () => {
        const { game } = round(base(), hit(9), miss);
        expect(game.cups.opp).toHaveLength(3);
        expect(game.islandStreak.me).toBe(0);
    });

    const twoIslands = () => {
        const g = newGame('me');
        // Gegner hat zwei Inseln und eine Gruppe
        g.cups.opp = g.cups.opp.filter(c => [0, 1, 2, 3, 4, 5, 9, 8].includes(c.id));
        g.cups.opp.find(c => c.id === 9)!.u = -0.85;
        g.cups.opp.find(c => c.id === 8)!.u = 0.85;
        return g;
    };

    it('zwei Island-Treffer mit direkt aufeinanderfolgenden Würfen: beim zweiten sechs Becher', () => {
        const { game } = round(twoIslands(), hit(9), hit(8), { island: [true, true] });
        // erstes Island: 2 Becher, zweites: 6 Becher; von acht bleibt nichts
        expect(game.cups.opp).toHaveLength(0);
        expect(game.islandsLeft.me).toBe(0);
    });

    it('liegt zwischen zwei Island-Treffern ein anderer Wurf, zählt das zweite nur zwei Becher', () => {
        // Runde 1: Island getroffen, dann ein normaler Treffer (Balls back: er wirft gleich weiter)
        let r = round(twoIslands(), hit(9), hit(3), { island: [true, false] });
        expect(r.game.turn).toBe('me');
        const before = r.game.cups.opp.length;
        // Runde 2: wieder ein Island, aber der Wurf davor war keins: nur zwei Becher
        r = round(r.game, hit(8), miss, { island: [true, false] });
        expect(r.game.cups.opp).toHaveLength(before - 2);
    });

    it('der letzte Wurf einer Runde und der erste der nächsten zählen als direkt hintereinander', () => {
        // Runde 1: erster Ball daneben, zweiter ein Island
        let r = round(twoIslands(), miss, hit(9), { island: [false, true] });
        const back = resolveRound(applyThrow(applyThrow(r.game, miss).game, miss).game).game;
        expect(back.islandStreak.me).toBe(1);
        // Runde 2: der erste Ball trifft sofort das nächste Island: sechs Becher
        r = round(back, hit(8), miss, { island: [true, false] });
        expect(r.game.cups.opp).toHaveLength(0);
    });

    it('Fehlversuch mit Ansage unterbricht die Serie', () => {
        const g = base();
        g.islandStreak.me = 1;
        const { game } = round(g, miss, miss, { island: [true, false] });
        expect(game.islandStreak.me).toBe(0);
    });
});

describe('Umstellen', () => {
    // Der Werfer stellt die Becher um, die er treffen muss (die der Gegenseite), und zwar nur auf die zehn Plätze
    it('ist erst ab vier Bechern auf der Gegenseite erlaubt', () => {
        const g = newGame('me');
        expect(canRearrange(g, 'me')).toBe(false);
        expect(canRearrange(withCups(g, 'opp', [0, 1, 2, 3]), 'me')).toBe(true);
        expect(canRearrange(withCups(g, 'opp', [0, 1, 2, 3, 4]), 'me')).toBe(false);
        // die eigenen Becher spielen dafür keine Rolle
        expect(canRearrange(withCups(g, 'me', [0, 1, 2, 3]), 'me')).toBe(false);
    });

    it('geht nur zu Beginn der eigenen Runde, nicht mitten in der Runde', () => {
        // fünf Becher stehen, ich treffe den ersten: jetzt stehen (nach der Runde) vier, aber umgestellt wird erst das nächste Mal
        let g = withCups(newGame('me'), 'opp', [9, 7, 8, 5, 4]);
        expect(canRearrange(g, 'me')).toBe(false);
        g = applyThrow(g, hit(9)).game;
        expect(canRearrange(g, 'me')).toBe(false);
        // auch ein verworfener erster Ball macht die Runde schon aktiv
        const missed = applyThrow(withCups(newGame('me'), 'opp', [0, 1, 2, 3]), miss).game;
        expect(canRearrange(missed, 'me')).toBe(false);
        // in der nächsten eigenen Runde (nach Balls back oder wenn ich wieder dran bin) sind es vier: jetzt geht es
        g = applyThrow(g, hit(7)).game;
        g = resolveRound(g).game;
        expect(g.cups.opp).toHaveLength(3);
        expect(g.turn).toBe('me');
        expect(canRearrange(g, 'me')).toBe(true);
    });

    it('mit fünf Bechern und nur einem Treffer ist in der nächsten Runde umstellen möglich', () => {
        let g = withCups(newGame('me'), 'opp', [9, 7, 8, 5, 4]);
        g = applyThrow(g, hit(9)).game;
        g = applyThrow(g, miss).game;
        g = resolveRound(g).game;
        // Becher 9 ist weg, vier stehen; der Gegner ist dran, dann wieder ich
        expect(g.cups.opp).toHaveLength(4);
        g = resolveRound(applyThrow(applyThrow(g, miss).game, miss).game).game;
        expect(g.turn).toBe('me');
        expect(canRearrange(g, 'me')).toBe(true);
    });

    it('stellt nur auf die zehn Plätze des Dreiecks und nur auf freie', () => {
        const g = withCups(newGame('me'), 'opp', [0, 1, 2, 3]);
        const free = freeSlots(g, 'opp');
        expect(free).toHaveLength(6);
        const moved = moveCup(g, 'me', 0, 9);
        const tip = slotsOf('opp', 1).find(s => s.id === 9)!;
        expect(moved.cups.opp.find(c => c.id === 0)).toMatchObject({ u: tip.u, v: tip.v });
        expect(slotIndexOf(moved, 'opp', moved.cups.opp.find(c => c.id === 0)!)).toBe(9);
        // ein belegter Platz geht nicht, ein Platz, den es nicht gibt, auch nicht
        expect(moveCup(g, 'me', 0, 1)).toBe(g);
        expect(moveCup(g, 'me', 0, 42)).toBe(g);
        // ein Becher, den es nicht gibt, lässt sich nicht stellen
        expect(moveCup(g, 'me', 9, 8)).toBe(g);
    });

    it('stellt vier Becher in der Anordnung 1-1-2 ohne Island', () => {
        for (const mirror of [false, true]) {
            const g = withCups(newGame('opp'), 'me', [0, 3, 6, 9]);
            const slots = oneOneTwoSlots(4, mirror);
            expect(slots).toHaveLength(4);
            const r = rearrange(g, 'opp', slots);
            expect(islandsOf(r.cups.me)).toEqual([]);
            expect(r.cups.me.map(c => slotIndexOf(r, 'me', c)).sort()).toEqual([...slots].sort());
            // Spitze, ein Becher in der Reihe dahinter, zwei in der Reihe danach
            const rows = new Map<number, number>();
            for (const c of r.cups.me) rows.set(c.v, (rows.get(c.v) ?? 0) + 1);
            expect([...rows.values()].sort()).toEqual([1, 1, 2]);
        }
        expect(oneOneTwoSlots(3, false)).toEqual([9, 7, 4]);
        expect(oneOneTwoSlots(1, false)).toEqual([9]);
    });
});

describe('Ausziehbecher', () => {
    it('der allererste Treffer auf den mittleren Becher der dritten Reihe zieht den Werfer aus', () => {
        const { game, events } = round(newGame('me'), hit(AUSZIEH_CUP), miss);
        expect(game.stripped).toBe('me');
        expect(events.some(e => e.type === 'strip')).toBe(true);
    });

    it('der nächste Treffer zieht ihn wieder an', () => {
        let r = round(newGame('me'), hit(AUSZIEH_CUP), miss);
        r = { game: resolveRound(applyThrow(applyThrow(r.game, miss).game, miss).game).game, events: [] };
        const next = round(r.game, hit(9), miss);
        expect(next.game.stripped).toBeNull();
        expect(next.events.some(e => e.type === 'dress')).toBe(true);
    });

    it('gilt nicht, wenn vorher schon irgendein Becher getroffen wurde', () => {
        let r = round(newGame('me'), hit(9), miss);
        r = { game: resolveRound(applyThrow(applyThrow(r.game, miss).game, miss).game).game, events: [] };
        const next = round(r.game, hit(AUSZIEH_CUP), miss);
        expect(next.game.stripped).toBeNull();
    });
});

describe('Trickshot', () => {
    it('ein Abpraller zurück über die Mitte gibt einen Bonuswurf, der keinen Wurf kostet', () => {
        let g = applyThrow(newGame('me'), { kind: 'rim', rolledBack: true }).game;
        expect(g.trickPending).toBe(true);
        const trick = applyThrow(g, hit(9), { trick: true });
        expect(trick.events[0].type).toBe('trick');
        expect(trick.game.trickPending).toBe(false);
        // vom Trickshot sind beide normalen Würfe unberührt: ein Wurf ist schon weg, einer bleibt
        expect(trick.game.throwsLeft).toBe(1);
        g = applyThrow(trick.game, miss).game;
        expect(roundOver(g)).toBe(true);
        expect(resolveRound(g).game.cups.opp).toHaveLength(9);
    });

    it('beim letzten Wurf hält ein offener Trickshot die Runde an, bis er gespielt oder ausgelassen ist', () => {
        let g = applyThrow(newGame('me'), miss).game;
        g = applyThrow(g, { kind: 'rim', rolledBack: true }).game;
        expect(roundOver(g)).toBe(false);
        expect(roundOver(skipTrick(g))).toBe(true);
    });

    it('ein Abpraller, der nicht zurückrollt, gibt keinen', () => {
        const g = applyThrow(newGame('me'), { kind: 'rim', rolledBack: false }).game;
        expect(g.trickPending).toBe(false);
    });
});

describe('Wegschlagen', () => {
    it('ein weggeschlagener Aufpraller trifft nicht', () => {
        const { game } = round(newGame('me'), { kind: 'blocked', cupId: 9, ownCupLost: null }, miss);
        expect(game.cups.opp).toHaveLength(10);
    });

    it('wer dabei eigene Becher umwirft, bekommt sie nicht zurück', () => {
        const { game, events } = round(newGame('me'), { kind: 'blocked', cupId: 9, ownCupLost: 3 }, miss);
        expect(game.cups.opp).toHaveLength(9);
        expect(game.cups.opp.map(c => c.id)).not.toContain(3);
        expect(events.some(e => e.type === 'remove' && e.reason === 'accident')).toBe(true);
    });
});

describe('Spielende', () => {
    // Gegner hat nur noch einen Becher
    const nearlyDone = (starter: Side, turn: Side) => {
        const g = newGame(starter);
        g.turn = turn;
        g.cups[turn === 'me' ? 'opp' : 'me'] = g.cups[turn === 'me' ? 'opp' : 'me'].filter(c => c.id === 9);
        g.hits.me = 1; g.hits.opp = 1;
        return g;
    };

    it('wer als Beginner alles trifft, lässt den anderen nachziehen', () => {
        const { game, events } = round(nearlyDone('me', 'me'), hit(9), miss);
        expect(game.winner).toBeNull();
        expect(game.catchUp).toBe(true);
        expect(game.turn).toBe('opp');
        expect(events.some(e => e.type === 'catchUp')).toBe(true);
    });

    it('wer nicht begonnen hat, gewinnt sofort, wenn er alles trifft', () => {
        const { game } = round(nearlyDone('me', 'opp'), hit(9), miss);
        expect(game.winner).toBe('opp');
    });

    it('nachgezogen wird nur einmal: ein Zug, danach ist Schluss', () => {
        const g = round(nearlyDone('me', 'me'), hit(9), miss).game;
        // er trifft einen Becher, den zweiten Ball nicht: kein Balls back, das Spiel ist aus
        const after = round(g, hit(2), miss);
        expect(after.game.winner).toBe('me');
        expect(after.events.some(e => e.type === 'over')).toBe(true);
    });

    it('nur mit Balls back zieht der Nachziehende weiter, solange er beide Bälle versenkt', () => {
        let r = round(nearlyDone('me', 'me'), hit(9), miss);
        r = round(r.game, hit(2), hit(3));
        expect(r.game.winner).toBeNull();
        expect(r.game.turn).toBe('opp');
        expect(r.game.catchUp).toBe(true);
        expect(r.events.some(e => e.type === 'ballsBack')).toBe(true);
        r = round(r.game, hit(4), miss);
        expect(r.game.winner).toBe('me');
    });

    it('trifft der Nachziehende alles, gibt es eine Verlängerung mit den vordersten drei Bechern je Seite', () => {
        let g = round(nearlyDone('me', 'me'), hit(9), miss).game;
        g.cups.me = g.cups.me.filter(c => c.id === 4);
        const { game, events } = round(g, hit(4), miss);
        expect(game.winner).toBeNull();
        expect(game.cups.me.map(c => c.id).sort()).toEqual([7, 8, 9]);
        expect(game.cups.opp.map(c => c.id).sort()).toEqual([7, 8, 9]);
        expect(game.turn).toBe('me');
        expect(game.catchUp).toBe(false);
        expect(events.some(e => e.type === 'overtime')).toBe(true);
    });

    it('die Verlängerung wiederholt sich, bis einer gewinnt', () => {
        let g = round(nearlyDone('me', 'me'), hit(9), miss).game;
        g.cups.me = g.cups.me.filter(c => c.id === 4);
        g = round(g, hit(4), miss).game;
        // zweite Verlängerung: wieder beide alles getroffen
        const clear = (game: Game) => { game.cups.opp = game.cups.opp.filter(c => c.id === 9); game.cups.me = game.cups.me.filter(c => c.id === 9); return game; };
        g = round(clear(g), hit(9), miss).game;
        expect(g.catchUp).toBe(true);
        g = round(g, hit(9), miss).game;
        expect(g.overtime).toBe(2);
        expect(g.winner).toBeNull();
        expect(g.cups.me).toHaveLength(3);
        // dritte Verlängerung entscheidet der Beginner
        g = round(clear(g), hit(9), miss).game;
        g = round(g, miss, miss).game;
        expect(g.winner).toBe('me');
    });

    it('wer ein ganzes Spiel ohne Treffer verliert, muss die nackte Meile laufen', () => {
        const g = nearlyDone('me', 'me');
        g.hits.opp = 0;
        let r = round(g, hit(9), miss);
        r = round(r.game, miss, miss);
        expect(r.game.winner).toBe('me');
        expect(r.game.nakedMile).toBe('opp');
    });

    it('mit mindestens einem Treffer gibt es keine nackte Meile', () => {
        let r = round(nearlyDone('me', 'me'), hit(9), miss);
        r = round(r.game, miss, miss);
        expect(r.game.nakedMile).toBeNull();
    });
});

describe('Island: allein stehen', () => {
    it('im vollen Dreieck steht keiner allein, auch die Spitze nicht', () => {
        const g = newGame('me');
        expect(islandsOf(g.cups.opp)).toEqual([]);
        expect(islandsOf(g.cups.me)).toEqual([]);
    });

    it('fehlt hinter der Spitze die ganze Reihe, steht die Spitze allein', () => {
        const g = newGame('me');
        // Reihe mit zwei Bechern (7, 8) weg: die Spitze (9) hat eine Reihe Abstand zu den dreien dahinter
        g.cups.opp = g.cups.opp.filter(c => ![7, 8].includes(c.id));
        expect(islandsOf(g.cups.opp).map(c => c.id)).toEqual([9]);
    });

    it('steht in der Reihe dahinter noch ein Becher, ist die Spitze keine Insel', () => {
        const g = newGame('me');
        g.cups.opp = g.cups.opp.filter(c => c.id !== 7);
        expect(islandsOf(g.cups.opp)).toEqual([]);
    });

    it('ein Becher mit Lücke in der Reihe gilt nicht als Insel, solange irgendwo ein Nachbar berührt', () => {
        const g = newGame('me');
        g.cups.opp = g.cups.opp.filter(c => c.id !== 5);
        expect(islandsOf(g.cups.opp)).toEqual([]);
    });
});

describe('Island: höchstens zwei pro Spiel', () => {
    const setup = () => {
        const g = newGame('me');
        // zwei Inseln und eine Gruppe
        g.cups.opp = g.cups.opp.filter(c => [0, 1, 2, 3, 9, 8].includes(c.id));
        g.cups.opp.find(c => c.id === 9)!.u = -0.85;
        g.cups.opp.find(c => c.id === 8)!.u = 0.85;
        return g;
    };

    it('jede Ansage verbraucht eine, auch wenn sie danebengeht', () => {
        let r = round(setup(), miss, miss, { island: [true, false] });
        expect(r.game.islandsLeft.me).toBe(1);
        // Gegner wirft daneben, ich sage noch einmal an
        r = { game: resolveRound(applyThrow(applyThrow(r.game, miss).game, miss).game).game, events: [] };
        r = round(r.game, miss, miss, { island: [true, false] });
        expect(r.game.islandsLeft.me).toBe(0);
    });

    it('die dritte Ansage gilt nicht mehr: der Treffer zählt wie ein normaler', () => {
        const g = setup();
        g.islandsLeft.me = 0;
        const { game } = round(g, hit(9), miss, { island: [true, false] });
        expect(game.cups.opp).toHaveLength(5);
        expect(game.islandStreak.me).toBe(0);
    });

    it('auch die Verlängerung bekommt keine neuen Ansagen', () => {
        let g = round(newGame('me'), miss, miss).game;
        g.islandsLeft.opp = 1;
        g.cups.opp = g.cups.opp.filter(c => c.id === 9);
        g.cups.me = g.cups.me.filter(c => c.id === 9);
        g.turn = 'me'; g.islandsLeft.me = 0;
        let r = round(g, hit(9), miss);
        r = round(r.game, hit(9), miss);
        expect(r.game.overtime).toBe(1);
        expect(r.game.islandsLeft).toEqual({ me: 0, opp: 1 });
    });

    it('ohne Insel auf dem Tisch kostet die Ansage nichts', () => {
        const { game } = round(newGame('me'), miss, miss, { island: [true, false] });
        expect(game.islandsLeft.me).toBe(2);
    });
});

describe('Umstellen: einmal und von Hand', () => {
    it('geht nur einmal pro Spiel', () => {
        const g = withCups(newGame('me'), 'opp', [0, 1, 2, 3]);
        const once = rearrange(g, 'me', oneOneTwoSlots(4, false));
        expect(once.rearranged.me).toBe(true);
        expect(canRearrange(once, 'me')).toBe(false);
        expect(moveCup(once, 'me', 0, 9)).toBe(once);
    });

    it('wer von Hand umstellt, schließt es mit finishRearranging ab', () => {
        let g = withCups(newGame('me'), 'opp', [0, 1, 2, 3]);
        g = moveCup(g, 'me', 0, 9);
        g = moveCup(g, 'me', 1, 7);
        expect(canRearrange(g, 'me')).toBe(true);
        g = finishRearranging(g, 'me');
        expect(canRearrange(g, 'me')).toBe(false);
    });

    it('beim Nachziehen darf nicht umgestellt werden', () => {
        const g = withCups(newGame('me'), 'me', [0, 1, 2, 3]);
        expect(canRearrange(g, 'opp')).toBe(true);
        expect(canRearrange({ ...g, catchUp: true }, 'opp')).toBe(false);
    });
});

describe('Trickshot im Zusammenspiel mit Bombe und Balls back', () => {
    it('erster Ball trifft, zweiter rollt zurück, der Trickshot trifft einen anderen Becher: Balls back', () => {
        let g = applyThrow(newGame('me'), hit(9)).game;
        g = applyThrow(g, { kind: 'rim', rolledBack: true }).game;
        expect(roundOver(g)).toBe(false);
        g = applyThrow(g, hit(7), { trick: true }).game;
        const { game, events } = resolveRound(g);
        expect(events.some(e => e.type === 'bomb')).toBe(false);
        expect(events.some(e => e.type === 'ballsBack')).toBe(true);
        expect(game.turn).toBe('me');
        expect(game.cups.opp).toHaveLength(8);
    });

    it('trifft der Trickshot denselben Becher wie der erste Ball: Bombe und Balls back', () => {
        let g = applyThrow(newGame('me'), hit(9)).game;
        g = applyThrow(g, { kind: 'rim', rolledBack: true }).game;
        g = applyThrow(g, hit(9), { trick: true }).game;
        const { game, events } = resolveRound(g);
        expect(events.some(e => e.type === 'bomb')).toBe(true);
        expect(events.some(e => e.type === 'ballsBack')).toBe(true);
        expect(game.turn).toBe('me');
        expect(game.cups.opp).toHaveLength(7);
    });

    it('verfehlt der Trickshot, bleibt es bei einem Treffer: kein Balls back, keine Bombe', () => {
        let g = applyThrow(newGame('me'), hit(9)).game;
        g = applyThrow(g, { kind: 'rim', rolledBack: true }).game;
        g = applyThrow(g, miss, { trick: true }).game;
        const { game, events } = resolveRound(g);
        expect(events.some(e => e.type === 'ballsBack' || e.type === 'bomb')).toBe(false);
        expect(game.turn).toBe('opp');
    });

    it('der Trickshot kommt auch bei einem Treffer im ersten und Rand im zweiten Wurf vor dem Rundenende', () => {
        let g = applyThrow(newGame('me'), hit(9)).game;
        g = applyThrow(g, { kind: 'rim', rolledBack: true }).game;
        // Wurf zwei ist verbraucht, die Runde wartet aber auf den Trickshot
        expect(g.throwsLeft).toBe(0);
        expect(roundOver(g)).toBe(false);
        expect(roundOver(skipTrick(g))).toBe(true);
    });
});

describe('Bechergröße', () => {
    it('größere Becher stehen weiter auseinander, bleiben aber ein berührendes Dreieck', () => {
        for (const size of [1, 1.25, 1.5]) {
            const g = newGame('me', size);
            expect(g.cups.opp).toHaveLength(10);
            expect(islandsOf(g.cups.opp, size)).toEqual([]);
            expect(islandsOf(g.cups.me, size)).toEqual([]);
            // alle Becher bleiben auf dem Tisch und in ihrer Hälfte
            for (const c of g.cups.opp) { expect(Math.abs(c.u)).toBeLessThan(1); expect(c.v).toBeGreaterThan(0.5); expect(c.v).toBeLessThan(1); }
            for (const c of g.cups.me) { expect(c.v).toBeGreaterThan(0); expect(c.v).toBeLessThan(0.5); }
        }
        const small = newGame('me', 1), large = newGame('me', 1.5);
        expect(Math.abs(large.cups.opp[0].u)).toBeGreaterThan(Math.abs(small.cups.opp[0].u));
    });

    it('die Spitze steht auch bei großen Bechern allein, wenn die Reihe dahinter fehlt', () => {
        const g = newGame('me', 1.5);
        g.cups.opp = g.cups.opp.filter(c => ![7, 8].includes(c.id));
        expect(islandsOf(g.cups.opp, 1.5).map(c => c.id)).toEqual([9]);
    });

    it('die Verlängerung stellt die vordersten drei Becher in der gewählten Größe auf', () => {
        let g = newGame('me', 1.25);
        g.cups.opp = g.cups.opp.filter(c => c.id === 9);
        g.cups.me = g.cups.me.filter(c => c.id === 9);
        g.hits = { me: 1, opp: 1 };
        g = round(g, hit(9), miss).game;
        g = round(g, hit(9), miss).game;
        expect(g.overtime).toBe(1);
        expect(g.cups.opp.map(c => c.id).sort()).toEqual([7, 8, 9]);
        expect(g.size).toBe(1.25);
        expect(islandsOf(g.cups.opp, 1.25)).toEqual([]);
    });
});
