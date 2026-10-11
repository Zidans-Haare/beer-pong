import { describe, it, expect } from 'vitest';
import { drawGameFrame, type GameView } from './draw';
import { newGame } from './engine';
import { lookFor } from '@/lib/tournament-film';

// Zeichenfläche, die jeden Aufruf annimmt und ungültige Maße wie ein Browser ablehnt
function fakeContext() {
    const gradient = { addColorStop: () => undefined };
    const target: Record<string, unknown> = {
        measureText: (text: string) => ({ width: text.length * 20 }),
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        ellipse: (_x: number, _y: number, rx: number, ry: number) => { if (rx < 0 || ry < 0) throw new Error(`negativer Ellipsenradius ${rx}/${ry}`); },
        arc: (_x: number, _y: number, r: number) => { if (r < 0) throw new Error(`negativer Kreisradius ${r}`); },
    };
    return new Proxy(target, {
        get: (obj, prop: string) => (prop in obj ? obj[prop] : () => undefined),
        set: (obj, prop: string, value) => { obj[prop] = value; return true; },
    }) as unknown as CanvasRenderingContext2D;
}

const base = (): GameView => ({
    primary: '#006b50', game: newGame('me'), names: { me: 'Nick', opp: 'Moonzy' }, skins: { me: '#fbe3c0', opp: '#7a4b2a' },
    looks: { me: lookFor('Nick'), opp: lookFor('Moonzy') }, enter: 1, ball: null, trail: [], vanishing: {}, swipe: null, blind: false, islandCall: false,
    rearranging: null, stamps: [], status: 'Dein Wurf', throwPhase: 0, mood: 0, anger: 0, flinch: 0, cheer: 0, shake: 0, swat: null, ending: null, level: 'Normal', hand: null, midFlash: null,
});

describe('drawGameFrame', () => {
    const variants: Record<string, (v: GameView) => void> = {
        'Grundbild': () => undefined,
        'Intro': v => { v.enter = 0.2; },
        'Flug mit Spur': v => { v.ball = { x: 500, y: 1200, r: 20 }; v.trail = [{ x: 480, y: 1250 }, { x: 490, y: 1230 }]; },
        'Moonzy mit Josie-Bild': v => { v.names = { me: 'Nick', opp: 'Moonzy' }; },
        'Mittellinie blitzt': v => { v.midFlash = 0; },
        'Wischspur': v => { v.swipe = [{ x: 600, y: 1700 }, { x: 610, y: 1500 }, { x: 625, y: 1300 }]; },
        'Augen zu': v => { v.blind = true; v.swipe = [{ x: 600, y: 1700 }, { x: 610, y: 1500 }]; },
        'Island angesagt': v => { v.islandCall = true; v.game.cups.opp = v.game.cups.opp.slice(0, 3); v.game.cups.opp[2].u = 0.8; },
        'Umstellen': v => { v.game.cups.me = v.game.cups.me.slice(0, 4); v.rearranging = { dragging: 1 }; },
        'Stempel': v => { v.stamps = [{ text: 'BOMBE!', start: 0 }]; },
        'Becher fliegen weg': v => { v.vanishing = { 'opp:9': 0, 'me:3': 0 }; },
        'Ball im Becher': v => { v.game.roundHits = [{ cupId: 9, bounce: false, island: false, remove: 1 }]; },
        'in Unterhose': v => { v.game.stripped.me = true; },
        'Gegner in Unterhose und wütend': v => { v.game.stripped.opp = true; v.anger = 1; v.mood = -1; },
        'Wegschlagen': v => { v.swat = { start: 0, duration: 800 }; },
        'Hand schlägt weg (links)': v => { v.hand = { start: 0, duration: 520, x: 540, y: 1450, from: -1, scale: 1, skin: '#fbe3c0', sleeve: '#2ec4b6' }; },
        'Hand schlägt weg (rechts, klein)': v => { v.hand = { start: 0, duration: 520, x: 520, y: 1010, from: 1, scale: 0.55, skin: '#7a4b2a', sleeve: '#3a86ff' }; },
        'Sieg': v => { v.ending = { start: 0, winner: 'me', nakedMile: null, winLabel: 'DU GEWINNST!', mileLabel: '' }; },
        'Niederlage': v => { v.ending = { start: 0, winner: 'opp', nakedMile: null, winLabel: 'Moonzy gewinnt', mileLabel: '' }; },
        'Nackte Meile': v => { v.ending = { start: 0, winner: 'me', nakedMile: 'opp', winLabel: 'DU GEWINNST!', mileLabel: 'Moonzy: Nackte Meile!' }; },
    };
    for (const [name, apply] of Object.entries(variants)) {
        it(`zeichnet zu jedem Zeitpunkt ohne Fehler: ${name}`, () => {
            const ctx = fakeContext();
            const view = base();
            apply(view);
            for (let time = 0; time <= 7000; time += 37) {
                expect(() => drawGameFrame(ctx, view, time), `bei ${time} ms`).not.toThrow();
            }
        });
    }
});
