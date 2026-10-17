'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Volume2, VolumeX, X, Mountain, ArrowDownToLine, LayoutGrid, Swords, Bot, Shuffle, Hand as HandOpen, HandFist, Scissors } from 'lucide-react';
import { SCENE_WIDTH, SCENE_HEIGHT, loadSceneFonts, loadSceneLogo, skinFor, lerp, clamp, easeOut, tablePoint, type FigureLook } from '@/lib/wrapped-scene';
import { lookFor, type FigureMap } from '@/lib/figure';
import {
    newGame, newOvertimeGame, applyThrow, resolveRound, roundOver, canTrick, skipTrick, canRearrange, rearrange, moveCup, finishRearranging, islandsOf, isIsland, rockPaperScissors,
    THROWS_PER_ROUND, CUP_SIZES, other, type Cup, type CupSize, type Game, type Side, type Hand, type ThrowResult, type GameEvent,
} from '@/lib/minigame/engine';
import { planAiThrow, planAiTrick, aiRearrangeSlots, aiSwat, aiHand, ROLL_BACK_CHANCE, DIFFICULTIES, type Difficulty } from '@/lib/minigame/ai';
import { judgeDirect, judgeBounce, cupMouth, hitRadii, flickLanding, tremor, type Point, type Sample } from '@/lib/minigame/aim';
import { birdCupAt, birdSlotAt, BIRD_ZOOM_MS } from '@/lib/minigame/birdseye';
import type { SceneTheme } from '@/lib/scene-theme';
import { arcAt, apexFor, groundSpot, mouthSpot, rimSpot, offsetIn, project, MY_HAND, OPP_HAND as OPP_HAND_3D, type Spot3 } from '@/lib/minigame/flight';
import { drawGameFrame, type GameView } from '@/lib/minigame/draw';
import { sharedGameAudio, type Fx } from '@/lib/minigame/audio';
import { throwsOfRound, roundsOf, hitsOf, type ReplayThrow } from '@/lib/minigame/replay';
import { recordCpuGame, createDuel, createOvertime, declineDuel, completeDuel, startDuel as startDuelAction, forfeitDuel } from '@/app/actions/minigame';
import { useAppDialog } from '@/components/AppDialog';

type Mode = 'pick' | 'invite' | 'rps' | 'play' | 'over';
// cpu: gegen den Rechner; run: Herausforderer legt vor; ghost: Nachziehender spielt gegen die Aufzeichnung
type Kind = 'cpu' | 'run' | 'ghost';
type Trick = 'eyes' | 'leg' | 'ceiling';

interface Controls {
    aim: boolean;
    islandAvailable: boolean;
    islandOn: boolean;
    bounceOn: boolean;
    bounceAvailable: boolean;
    canRearrange: boolean;
    islandsLeft: number;
    rearranging: boolean;
    trick: boolean;
    swat: boolean;
    rps: boolean;
    // Schere-Stein-Papier: beide Hände und darunter, wer anfängt
    rpsResult: { mine: Hand; theirs: Hand; line?: string } | null;
    hint: string;
    over: { won: boolean; mile: boolean } | null;
}

const IDLE: Controls = { aim: false, islandAvailable: false, islandOn: false, bounceOn: false, bounceAvailable: false, canRearrange: false, islandsLeft: 0, rearranging: false, trick: false, swat: false, rps: false, rpsResult: null, hint: '', over: null };
// Icons statt Emojis
const HAND_ICON: Record<Hand, typeof HandFist> = { rock: HandFist, paper: HandOpen, scissors: Scissors };
const HAND = { x: SCENE_WIDTH / 2 + 150, y: 1650 };
const OPP_HAND = { x: SCENE_WIDTH / 2 + 30, y: 880 };
// Mittellinie des Tisches auf dem Bild: Wer den Ball darüber zurückrollen sieht, bekommt einen Trickshot
const MID_Y = tablePoint(0, 0.5).y;
// Ein Aufpraller, der keinen Becher trifft, prallt so oft noch an einem Becher ab (dann wie ein Randtreffer)
const BOUNCE_CLIP_CHANCE = 0.35;
// Becher, der einem Punkt auf dem Tisch am nächsten steht
const nearestCup = (cups: Cup[], at: { u: number; v: number }) => cups.reduce<Cup | null>((best, c) => (!best || Math.hypot(c.u - at.u, (c.v - at.v) * 3) < Math.hypot(best.u - at.u, (best.v - at.v) * 3) ? c : best), null);
// Aufpraller ohne Treffer: fliegt hinten weg oder prallt an einem Becher ab und rollt zurück
const bounceMiss = (nearCups: boolean): ThrowResult => (nearCups && rand() < BOUNCE_CLIP_CHANCE ? { kind: 'rim', rolledBack: rand() < ROLL_BACK_CHANCE } : { kind: 'miss' });

const key = (side: Side, id: number) => `${side}:${id}`;
const rand = () => Math.random();
const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)];

type AimChoice = { type: 'throw'; point: Point; bounce: boolean; island: boolean; exact?: boolean } | { type: 'rearrange' };

export interface GamePlayer { id: string; name: string }
// overtime: Verlängerung eines Duells (drei Becher pro Seite, kein Schnick, Schnack, Schnuck, nicht ablehnbar)
export interface DuelInfo { id: string; cupSize: CupSize; challengerName: string; starter: 'CHALLENGER' | 'OPPONENT'; challengerHand: Hand; opponentHand: Hand; replay: ReplayThrow[]; overtime?: boolean }
export interface OpenDuel { id: string; name: string; overtime?: boolean }

interface GhostState { replay: ReplayThrow[]; round: number; used: number; duelId: string }

export default function BeerPongGame({ meName, players, incoming, outgoing, duel: duelProp, abandoned, figures, backHref, theme }: {
    meName: string; players: GamePlayer[]; incoming: OpenDuel[]; outgoing: OpenDuel[]; duel: DuelInfo | null; abandoned: string[]; figures: FigureMap; backHref: string; theme?: SceneTheme;
}) {
    const t = useTranslations('game');
    const dialog = useAppDialog();
    // Das Duell bleibt so, wie es beim Öffnen war. Wird es abgeschlossen, lädt die Seite ohne Duell nach; das Ergebnisbild darf dabei nicht verschwinden.
    const [duel] = useState(duelProp);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mode, setMode] = useState<Mode>(duel ? 'invite' : 'pick');
    const [pickKind, setPickKind] = useState<'duel' | 'cpu'>(players.length > 0 ? 'duel' : 'cpu');
    const [busy, setBusy] = useState(false);
    const [difficulty, setDifficulty] = useState<Difficulty>('normal');
    // Bechergröße: klein, mittel oder groß; wird gemerkt
    const [cupSize, setCupSize] = useState<CupSize>('small');
    useEffect(() => {
        try { const saved = localStorage.getItem('game-cup-size'); if (saved === 'small' || saved === 'medium' || saved === 'large') setCupSize(saved); } catch { /* ohne Speicher */ }
    }, []);
    const chooseSize = (size: CupSize) => { setCupSize(size); try { localStorage.setItem('game-cup-size', size); } catch { /* ohne Speicher */ } };
    const sizeRef = useRef<CupSize>('small');
    const [opponent, setOpponent] = useState<string | null>(null);
    const [ctl, setCtl] = useState<Controls>(IDLE);
    const [status, setStatus] = useState('');
    const [muted, setMuted] = useState(false);
    const [ready, setReady] = useState(false);
    const [round, setRound] = useState(0);

    const ctlRef = useRef<Controls>(IDLE);
    const viewRef = useRef<GameView | null>(null);
    const gameRef = useRef<Game | null>(null);
    const runId = useRef(0);
    const logo = useRef<HTMLImageElement | null>(null);
    const waiter = useRef<((value: unknown) => void) | null>(null);
    // Wischen: Punkte mit Zeit, solange der Finger unten ist
    const aim = useRef({ waiting: false, active: false, samples: [] as Sample[], factor: 1, blind: false });
    const drag = useRef<{ cupId: number } | null>(null);
    const kindRef = useRef<Kind>('cpu');
    const ghostRef = useRef<GhostState | null>(null);
    const roundsRef = useRef({ me: 0, opp: 0 });
    const logRef = useRef<ReplayThrow[]>([]);
    // Verlängerung im Duell: läuft das aktuelle Spiel als Verlängerung, ist das Duell, das sie beendet, und soll nach dem Nachziehen die Verlängerung gespielt werden
    const overtimeRef = useRef(false);
    const overtimeSwitchRef = useRef(false);
    const overtimeRowRef = useRef<string | null>(null);
    const targetPlayer = useRef<GamePlayer | null>(null);
    const handsRef = useRef<{ mine: Hand; theirs: Hand } | null>(null);
    const statusRef = useRef('');
    statusRef.current = status;
    const difficultyRef = useRef(difficulty);
    difficultyRef.current = difficulty;

    const setControls = useCallback((patch: Partial<Controls>) => {
        ctlRef.current = { ...ctlRef.current, ...patch };
        setCtl(ctlRef.current);
    }, []);

    const meLook = useMemo<FigureLook>(() => lookFor(meName, 0, figures), [meName, figures]);
    void meLook;

    // Ein angenommenes, aber nicht beendetes Duell (Seite neu geladen, App geschlossen) gilt als aufgegeben
    useEffect(() => {
        if (abandoned.length === 0) return;
        void (async () => {
            await Promise.all(abandoned.map(id => forfeitDuel(id)));
            await dialog.alert(t('duel.abandoned'));
            window.location.assign('/game');
        })();
        // nur beim ersten Anzeigen der Seite
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { loadSceneFonts().then(() => loadSceneLogo()).then(image => { logo.current = image; setReady(true); }); }, []);

    // ---- Hilfen für Ablauf, Ton und Stempel ----
    const alive = (id: number) => runId.current === id;
    const mutedRef = useRef(muted);
    mutedRef.current = muted;
    const fx = useCallback((kind: Fx) => { if (!mutedRef.current) { try { sharedGameAudio()?.fx(kind); } catch { /* ohne Ton weiter */ } } }, []);

    const animate = useCallback((id: number, ms: number, step: (k: number) => void) => new Promise<void>(resolve => {
        const start = performance.now();
        const tick = () => {
            if (runId.current !== id) return resolve();
            const k = Math.min(1, (performance.now() - start) / ms);
            step(k);
            if (k < 1) requestAnimationFrame(tick); else resolve();
        };
        tick();
    }), []);
    const wait = useCallback((id: number, ms: number) => animate(id, ms, () => undefined), [animate]);
    const input = useCallback(<T,>() => new Promise<T>(resolve => { waiter.current = resolve as (value: unknown) => void; }), []);
    const answer = useCallback((value: unknown) => { const w = waiter.current; waiter.current = null; w?.(value); }, []);

    const announce = useCallback((text: string, sound?: Fx, color?: string, delay = 0) => {
        const view = viewRef.current;
        if (!view) return;
        view.stamps.push({ text, start: performance.now() + delay, color });
        if (sound) setTimeout(() => fx(sound), delay);
    }, [fx]);

    // Publikum jubelt; ein stärkerer Jubel ersetzt einen schwächeren, der noch läuft
    const cheerCrowd = useCallback((strength: number) => {
        const view = viewRef.current;
        if (!view) return;
        const now = performance.now();
        const current = view.crowdCheer ? view.crowdCheer.strength * (1 - Math.min(1, (now - view.crowdCheer.at) / 2200)) : 0;
        if (strength >= current) view.crowdCheer = { at: now, strength };
    }, []);

    // ---- Flugbahnen ----
    const fly = useCallback(async (id: number, from: Point & { r: number }, to: Point & { r: number }, ms: number, height: number) => {
        const view = viewRef.current;
        // nach dem Zurück ins Menü ist das Spielfeld schon weg
        if (!view) return;
        view.trail = [];
        await animate(id, ms, k => {
            const ground = { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) };
            const p = { x: ground.x, y: ground.y - Math.sin(k * Math.PI) * height, r: lerp(from.r, to.r, k) };
            view.ball = { ...p, ground };
            view.trail.push({ x: p.x, y: p.y });
            if (view.trail.length > 6) view.trail.shift();
        });
        view.trail = [];
    }, [animate]);

    // Wurf als Parabel über dem Tisch (siehe flight.ts); `fade` lässt den Ball am Ende verschwinden
    const arc = useCallback(async (id: number, from: Spot3, to: Spot3, ms: number, apex = apexFor(from, to), fade = false) => {
        const view = viewRef.current;
        if (!view) return;
        view.trail = [];
        await animate(id, ms, k => {
            const p = arcAt(from, to, apex, k);
            view.ball = fade ? { ...p, alpha: 1 - k * k } : p;
            view.trail.push({ x: p.x, y: p.y });
            if (view.trail.length > 6) view.trail.shift();
        });
        view.trail = [];
        if (fade) view.ball = null;
    }, [animate]);

    // Aufprall auf dem Tisch: Ball staucht sich kurz, ein Ring zeigt die Stelle, dazu der Ton
    const bounceOff = useCallback(async (id: number, at: Point & { r: number }) => {
        const view = viewRef.current;
        if (!view) return;
        fx('bounce');
        view.impacts = [...(view.impacts ?? []).filter(i => performance.now() - i.start < 500), { x: at.x, y: at.y, r: at.r * 2, start: performance.now() }];
        await animate(id, 110, k => { view.ball = { ...at, ground: { x: at.x, y: at.y }, squash: Math.sin(k * Math.PI) }; });
    }, [animate, fx]);

    // Ball verschwindet im Becher
    const sink = useCallback(async (id: number, at: Point & { r: number }) => {
        const view = viewRef.current;
        // nach dem Zurück ins Menü ist das Spielfeld schon weg
        if (!view) return;
        await animate(id, 220, k => { view.ball = { x: at.x, y: at.y + k * 26, r: at.r * (1 - k * 0.55), alpha: 1 - k * 0.2 }; });
        view.ball = null;
    }, [animate]);

    // Ball springt weg oder fällt vom Tisch
    const leave = useCallback(async (id: number, from: Point & { r: number }, to: Point, ms: number, height: number) => {
        const view = viewRef.current;
        // nach dem Zurück ins Menü ist das Spielfeld schon weg
        if (!view) return;
        await animate(id, ms, k => { view.ball = { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) - Math.sin(k * Math.PI) * height, r: from.r * (1 + 0.3 * k), alpha: 1 - k * k }; });
        view.ball = null;
    }, [animate]);

    // ---- Ergebnisse als Stempel und Ton ----
    const showEvents = useCallback((events: GameEvent[], by: Side) => {
        const view = viewRef.current;
        // nach dem Zurück ins Menü ist das Spielfeld schon weg
        if (!view) return;
        for (const e of events) {
            if (e.type === 'hit') {
                cheerCrowd(e.island ? 0.8 : 0.35);
                announce(e.island ? t('stamp.island') : e.bounce ? t('stamp.bounce') : t('stamp.hit'), e.island ? 'island' : 'plop', e.bounce || e.island ? '#ffb347' : undefined);
                view.shake = 1;
                if (by === 'me') { view.flinch = 1; view.mood = Math.max(-0.6, view.mood - 0.12); }
            } else if (e.type === 'miss') announce(t('stamp.miss'), 'miss', '#ffffff');
            else if (e.type === 'rim') announce(e.rolledBack ? t('stamp.rimBack') : t('stamp.rim'), 'rim', '#ffffff');
            else if (e.type === 'blocked') announce(t('stamp.blocked'), 'swat', '#ff8a8a');
            else if (e.type === 'strip') announce(t('stamp.strip'), 'strip', '#ff9fb2');
            else if (e.type === 'dress') announce(t('stamp.dress'), 'dress', '#9be59b');
            else if (e.type === 'trick') announce(t('stamp.trick'), 'trick', '#8fd3ff');
            else if (e.type === 'remove' && e.reason === 'accident') announce(t('stamp.accident'), 'miss', '#ff8a8a', 700);
        }
    }, [announce, cheerCrowd, t]);

    // ---- Wischen ----
    const waitAim = useCallback(async (opts: { factor?: number; blind?: boolean }): Promise<AimChoice | undefined> => {
        const a = aim.current;
        a.waiting = true; a.active = false; a.samples = []; a.factor = opts.factor ?? 1; a.blind = !!opts.blind;
        if (viewRef.current) viewRef.current.blind = a.blind;
        const result = await input<AimChoice | undefined>();
        a.waiting = false; a.active = false; a.samples = [];
        if (viewRef.current) { viewRef.current.swipe = null; viewRef.current.blind = false; }
        return result;
    }, [input]);

    // Ball prallt vom Becherrand ab und rollt über den Tisch zurück. Kommt er über die Mittellinie, blitzt sie auf und es
    // gibt einen Trickshot; sonst bleibt er davor liegen.
    const rollBack = useCallback(async (id: number, from: Point & { r: number }, thrower: Side, crossed: boolean) => {
        const view = viewRef.current;
        // nach dem Zurück ins Menü ist das Spielfeld schon weg
        if (!view) return;
        const mid = tablePoint(0, 0.5).y;
        // der Ball rollt zum Werfer zurück: bei mir nach unten, beim Gegner nach oben
        const dir = thrower === 'me' ? 1 : -1;
        const endY = crossed ? mid + dir * 150 : mid - dir * 110;
        const endX = from.x + (rand() < 0.5 ? -1 : 1) * (40 + rand() * 60);
        const ms = crossed ? 1000 : 800;
        let flashed = false;
        await animate(id, ms, k => {
            const e = easeOut(k);
            const x = lerp(from.x, endX, e);
            const groundY = lerp(from.y, endY, e);
            const y = groundY - Math.abs(Math.sin(k * Math.PI * 3)) * 26 * (1 - k);
            // beim Rollen wird der Ball in der Perspektive größer, wenn er zu mir kommt
            const r = lerp(from.r, thrower === 'me' ? from.r * 1.5 : from.r * 0.8, e);
            view.ball = { x, y, r, alpha: k > 0.85 ? 1 - (k - 0.85) / 0.15 * 0.6 : 1, ground: { x, y: groundY } };
            if (crossed && !flashed && (thrower === 'me' ? y > mid : y < mid)) { flashed = true; view.midFlash = performance.now(); fx('rim'); }
        });
        view.ball = null;
    }, [animate, fx]);

    // Hand schlägt den Aufpraller weg: Hand holt aus, klatscht auf den Ball, der Ball fliegt davon. Ein Missgeschick
    // (`lostCup`) reißt einen Becher des Schlagenden mit; er bleibt dann weg.
    const slapAway = useCallback(async (id: number, ball: Point & { r: number }, by: Side, lostCup: number | null) => {
        const view = viewRef.current;
        // nach dem Zurück ins Menü ist das Spielfeld schon weg
        if (!view) return;
        const g = gameRef.current!;
        const size = g.size;
        // Becher der Seite, die schlägt: wer wegschlägt, steht auf der Seite, deren Becher getroffen würden
        const cupsSide: Side = by === 'me' ? 'me' : 'opp';
        const scale = (by === 'me' ? 1 : 0.6) * (size >= 1 ? size : 1) * 1.15;
        view.ball = { ...ball };
        view.hand = {
            start: performance.now(), duration: 520, x: ball.x, y: ball.y, from: by === 'me' ? 1 : -1, scale,
            skin: view.skins[by], sleeve: view.looks[by].shirt,
        };
        await wait(id, 280);
        fx('swat');
        view.shake = 0.7;
        const side = by === 'me' ? 1 : -1;
        // der Ball fliegt in die Richtung des Schlags davon
        void leave(id, ball, { x: ball.x - side * 380, y: ball.y + (by === 'me' ? 260 : 220) }, 460, 120);
        if (lostCup !== null) {
            // eigener Becher fliegt mit
            view.vanishing[key(cupsSide, lostCup)] = performance.now() + 120;
            await wait(id, 760);
            delete view.vanishing[key(cupsSide, lostCup)];
        } else await wait(id, 480);
        view.hand = null;
    }, [fx, leave, wait]);

    // ---- Wurf des Spielers ----
    const myThrow = useCallback(async (id: number, trick: Trick | null): Promise<void> => {
        const running = kindRef.current === 'run';
        const view = viewRef.current!;
        let g = gameRef.current!;
        const first = g.throwsLeft === THROWS_PER_ROUND && !trick;
        for (;;) {
            if (runId.current !== id) return;
            setControls({
                aim: true, islandAvailable: !trick && g.islandsLeft.me > 0 && g.cups.opp.length >= 2 && islandsOf(g.cups.opp, g.size).length > 0, islandOn: false, bounceOn: false,
                // im Duell gibt es keine Aufpraller: Der andere sitzt nicht dabei und könnte sie nicht wegschlagen
                bounceAvailable: !trick && kindRef.current === 'cpu',
                canRearrange: first && canRearrange(g, 'me'), rearranging: false, islandsLeft: g.islandsLeft.me, hint: trick ? t('hint.trick') : t('hint.swipe'),
            });
            setStatus(trick ? t('status.trick') : t('status.yourThrow', { count: g.throwsLeft }));
            const choice = await waitAim({ factor: trick === 'eyes' ? 1.5 : trick === 'leg' ? 1.7 : trick === 'ceiling' ? 2 : 1, blind: trick === 'eyes' });
            if (runId.current !== id || !choice) return;
            if (choice.type === 'rearrange') {
                setControls({ aim: false, rearranging: true, canRearrange: false, hint: t('hint.rearrange') });
                // heranzoomen: die Becher von oben, groß genug zum Antippen
                view.rearranging = { dragging: null, start: performance.now(), closing: null, dragPoint: null };
                await input<void>();
                drag.current = null;
                view.rearranging.closing = performance.now();
                view.rearranging.dragging = null;
                await new Promise(resolve => setTimeout(resolve, BIRD_ZOOM_MS));
                view.rearranging = null;
                if (runId.current !== id) return;
                // Umgestellt wird nur einmal pro Spiel
                gameRef.current = finishRearranging(gameRef.current!, 'me');
                g = gameRef.current;
                continue;
            }
            setControls({ aim: false, hint: '' });
            // unsichtbares Zittern der Hand, je nach Stufe und bei Tricks größer
            const jitter = choice.exact ? { x: 0, y: 0 } : tremor(DIFFICULTIES[difficultyRef.current].sway, choice.point.y, aim.current.factor, rand);
            const point = { x: choice.point.x + jitter.x, y: choice.point.y + jitter.y };
            const bounce = choice.bounce && !trick && kindRef.current === 'cpu';
            const islandCalled = choice.island && !trick;

            // Wurf auswerten
            const judged = bounce ? judgeBounce(g.cups.opp, point, g.size) : judgeDirect(g.cups.opp, point, g.size);
            // beim Vorlegen sitzt noch niemand gegenüber: Wegschlagen kann erst der Nachziehende
            const swatted = judged.kind === 'hit' && bounce && !running ? aiSwat(g, rand, difficultyRef.current) : null;
            let result: ThrowResult;
            if (judged.kind === 'hit' && swatted?.swat) result = { kind: 'blocked', cupId: judged.cupId, ownCupLost: swatted.ownCupLost };
            else if (judged.kind === 'hit') result = { kind: 'hit', cupId: judged.cupId, bounce };
            else if (judged.kind === 'rim') result = { kind: 'rim', rolledBack: rand() < ROLL_BACK_CHANCE };
            else result = bounceMiss(bounce && point.y < MID_Y);

            // Animation: Wurfarm, dann Ball
            fx('throw');
            await animate(id, 320, k => { view.throwPhase = k * 0.5; });
            const start = { ...HAND, r: 30 };
            const cupOf = (cupId: number) => g.cups.opp.find(c => c.id === cupId)!;
            if (bounce) {
                // steil auf den Tisch, sichtbarer Aufprall, dann ein flacher Bogen von oben in den Becher
                const landing = groundSpot(point);
                await arc(id, MY_HAND, landing, 520, apexFor(MY_HAND, landing) * 0.8);
                await bounceOff(id, project(landing));
                if (result.kind === 'hit' || result.kind === 'blocked') {
                    const to = mouthSpot(cupOf(result.cupId), g.size);
                    await arc(id, landing, to, 360, 70);
                    const end = project(to);
                    if (result.kind === 'blocked') {
                        // der Computer schlägt den Ball mit der Hand weg
                        await slapAway(id, end, 'opp', result.ownCupLost);
                    } else await sink(id, end);
                } else if (result.kind === 'rim') {
                    // prallt nach dem Aufprall vorn an einem Becher ab und rollt zurück; über die Mitte gibt es einen Trickshot
                    const near = nearestCup(g.cups.opp, landing);
                    const to = near ? rimSpot(near, g.size, { x: landing.u - near.u, y: 1 }) : { ...landing, v: landing.v + 0.06, h: 60 };
                    await arc(id, landing, to, 260, 40);
                    fx('rim');
                    await rollBack(id, project(to), 'me', result.rolledBack);
                } else await arc(id, landing, { u: landing.u + (landing.u - MY_HAND.u) * 0.15, v: landing.v + 0.3, h: 0 }, 520, 110, true);
            } else if (trick === 'ceiling') {
                const mid = { x: point.x, y: 120, r: 16 };
                await fly(id, start, mid, 420, 0);
                const m = result.kind === 'hit' ? cupMouth(cupOf(result.cupId), g.size) : null;
                const end = { x: m ? m.x : point.x, y: m ? m.y : point.y, r: 15 };
                await fly(id, mid, end, 420, 0);
                if (result.kind === 'hit') await sink(id, end); else await leave(id, end, { x: end.x + 30, y: end.y + 160 }, 350, 40);
            } else if (result.kind === 'hit') {
                // fällt von oben in die Bieröffnung, leicht zur Seite, auf die gezielt wurde
                const cup = cupOf(result.cupId);
                const to = mouthSpot(cup, g.size, offsetIn(point, cupMouth(cup, g.size)));
                await arc(id, MY_HAND, to, 720);
                await sink(id, project(to));
            } else if (result.kind === 'rim' && judged.kind === 'rim') {
                // trifft sichtbar den Rand auf der Seite, auf der er ankam, und springt ab
                const cup = cupOf(judged.cupId);
                const to = rimSpot(cup, g.size, offsetIn(point, cupMouth(cup, g.size)));
                await arc(id, MY_HAND, to, 720);
                fx('rim');
                await rollBack(id, project(to), 'me', result.rolledBack);
            } else {
                // landet auf dem Tisch und springt weiter weg, nie zurück über die Mitte (das wäre ein Trickshot)
                const to = groundSpot(point);
                await arc(id, MY_HAND, to, 720);
                await bounceOff(id, project(to));
                await arc(id, to, { u: to.u + (to.u - MY_HAND.u) * 0.2, v: to.v + 0.22, h: 0 }, 420, 80, true);
            }
            await animate(id, 220, k => { view.throwPhase = 0.5 + k * 0.5; });
            view.throwPhase = 0;
            if (runId.current !== id) return;

            const out = applyThrow(g, result, { islandCalled, trick: !!trick });
            gameRef.current = out.game; g = out.game;
            if (running) logRef.current.push({ r: roundsRef.current.me, result, island: islandCalled, trick: !!trick });
            showEvents(out.events, 'me');
            await wait(id, 650);
            return;
        }
    }, [animate, arc, bounceOff, fly, fx, input, leave, setControls, rollBack, showEvents, sink, slapAway, t, wait, waitAim]);

    // ---- Wurf des Gegners ----
    const oppThrow = useCallback(async (id: number, trick: boolean): Promise<void> => {
        const view = viewRef.current!;
        const g = gameRef.current!;
        const lastHit = g.roundHits.length ? g.roundHits[g.roundHits.length - 1].cupId : null;
        // Duell: Wurf aus der Aufzeichnung des Herausforderers, solange sie reicht, danach spielt der Rechner weiter
        const ghost = ghostRef.current;
        let scripted: ReplayThrow | null = null;
        if (ghost) {
            const next = throwsOfRound(ghost.replay, ghost.round)[ghost.used] ?? null;
            if (next) { scripted = next; ghost.used++; }
        }
        let plan = trick || scripted ? null : planAiThrow(g, rand, difficultyRef.current, lastHit, kindRef.current === 'cpu');
        let result0: ThrowResult;
        if (scripted) {
            const r = scripted.result;
            // Ein Becher, den es auf diesem Tisch nicht mehr gibt, kann nicht getroffen werden
            result0 = r.kind === 'hit' && !g.cups.me.some(c => c.id === r.cupId) ? { kind: 'miss' } : r;
            // Aufpraller zählen im Duell nicht (ältere Aufzeichnungen können noch welche enthalten)
            if (result0.kind === 'hit' && result0.bounce) result0 = { ...result0, bounce: false };
        } else if (trick) result0 = planAiTrick(g, rand, difficultyRef.current);
        else result0 = plan!.result;
        if (plan?.bounce && result0.kind === 'miss') result0 = bounceMiss(true);
        if (!plan && !scripted && !trick) plan = null;
        const targetId = result0.kind === 'hit' ? result0.cupId : plan?.cupId ?? g.cups.me[Math.floor(rand() * g.cups.me.length)]?.id;
        const target = g.cups.me.find(c => c.id === targetId) ?? g.cups.me[0];
        if (!target) return;
        const bounce = !!plan?.bounce;
        const islandCalled = scripted ? scripted.island : !!plan?.islandCall;
        const isTrick = trick || !!scripted?.trick;
        setStatus(isTrick ? t('status.oppTrick', { name: view.names.opp }) : t('status.oppThrows', { name: view.names.opp }));
        if (islandCalled && isIsland(g.cups.me, target, g.size)) announce(t('stamp.islandCall'), 'island', '#ffe08a');
        if (isTrick) announce(t('stamp.trick'), 'trick', '#8fd3ff');
        await wait(id, islandCalled || isTrick ? 900 : 500);
        if (runId.current !== id) return;

        fx('throw');
        const m = cupMouth(target, g.size);
        const into = mouthSpot(target, g.size);
        const end = project(into);
        let result: ThrowResult = result0;
        if (bounce) {
            // springt aus seiner Sicht vor meinem Becher auf (zwischen ihm und dem Becher), dann von oben hinein
            const baseSpot: Spot3 = { u: target.u + (rand() - 0.5) * 0.04, v: target.v + 0.075 * g.size, h: 0 };
            const base = project(baseSpot);
            await arc(id, OPP_HAND_3D, baseSpot, 520, apexFor(OPP_HAND_3D, baseSpot) * 0.8);
            await bounceOff(id, base);
            if (result.kind === 'hit') {
                // Fenster zum Wegschlagen: der Ball fliegt auf den Becher zu, der Knopf ist kurz da
                const windowMs = 850;
                const t0 = performance.now();
                view.swat = { start: t0, duration: windowMs };
                setControls({ swat: true, hint: t('hint.swat') });
                let swatAt: number | null = null;
                void input<'swat'>().then(() => { swatAt = performance.now() - t0; });
                const posAt = (k: number) => arcAt(baseSpot, into, 70, k);
                await new Promise<void>(resolve => {
                    const tick = () => {
                        if (runId.current !== id) return resolve();
                        const k = Math.min(1, (performance.now() - t0) / windowMs);
                        view.ball = posAt(swatAt !== null ? Math.min(1, swatAt / windowMs) : k);
                        if (swatAt !== null || k >= 1) return resolve();
                        requestAnimationFrame(tick);
                    };
                    tick();
                });
                waiter.current = null;
                view.swat = null;
                setControls({ swat: false, hint: '' });
                if (runId.current !== id) return;
                if (swatAt !== null) {
                    // Ein Schlag zur rechten Zeit trifft sauber; zu früh oder zu spät kann ein eigener Becher mitfliegen
                    const clean = swatAt >= 450 && swatAt <= 760;
                    const accident = rand() < (clean ? 0.03 : 0.12) ? pick(g.cups.me).id : null;
                    result = { kind: 'blocked', cupId: target.id, ownCupLost: accident };
                    await slapAway(id, view.ball ?? end, 'me', accident);
                } else await sink(id, end);
            } else if (result.kind === 'rim') {
                // Aufpraller des Gegners prallt vorn (auf seiner Seite) an meinem Becher ab und rollt zu ihm zurück
                const to = rimSpot(target, g.size, { x: (rand() - 0.5) * 0.6, y: -1 });
                await arc(id, baseSpot, to, 260, 40);
                fx('rim');
                await rollBack(id, project(to), 'opp', result.rolledBack);
            } else await arc(id, baseSpot, { u: baseSpot.u + (rand() - 0.5) * 0.2, v: Math.max(0, baseSpot.v - 0.3), h: 0 }, 480, 100, true);
        } else {
            const side = rand() < 0.5 ? -1 : 1;
            if (result.kind === 'hit') {
                // von oben in die Öffnung
                await arc(id, OPP_HAND_3D, mouthSpot(target, g.size, { x: (rand() - 0.5) * 0.8, y: (rand() - 0.5) * 0.8 }), 720);
                await sink(id, end);
            } else if (result.kind === 'rim') {
                // trifft den Rand seitlich oder hinten (von mir aus gesehen) und springt ab
                const to = rimSpot(target, g.size, { x: side, y: -0.4 + rand() * 0.6 });
                await arc(id, OPP_HAND_3D, to, 720);
                fx('rim');
                await rollBack(id, project(to), 'opp', result.rolledBack);
            } else {
                // landet neben dem Becher auf dem Tisch und springt weiter zu mir, nie zurück über die Mitte
                const to: Spot3 = { u: target.u + side * (0.16 + rand() * 0.18) * g.size, v: target.v + (rand() - 0.5) * 0.06, h: 0 };
                await arc(id, OPP_HAND_3D, to, 720);
                await bounceOff(id, project(to));
                await arc(id, to, { u: to.u + side * 0.08, v: Math.max(0, to.v - 0.12), h: 0 }, 380, 70, true);
            }
        }
        if (runId.current !== id) return;

        const out = applyThrow(g, result, { islandCalled, trick: isTrick });
        gameRef.current = out.game;
        showEvents(out.events, 'opp');
        if (out.events.some(e => e.type === 'hit')) view.mood = Math.min(0.2, view.mood + 0.2);
        await wait(id, 650);
    }, [announce, arc, bounceOff, fx, input, setControls, rollBack, showEvents, sink, slapAway, t, wait]);

    // ---- Runde beenden ----
    const finishRound = useCallback(async (id: number) => {
        const view = viewRef.current!;
        const g = gameRef.current!;
        const out = resolveRound(g);
        const defender = other(g.turn);
        if (out.events.some(e => e.type === 'bomb')) { cheerCrowd(1); announce(t('stamp.bomb'), 'bomb', '#ff9f43'); view.shake = 1.4; await wait(id, 900); }
        const removes = out.events.filter((e): e is Extract<GameEvent, { type: 'remove' }> => e.type === 'remove' && e.reason !== 'accident');
        const now = performance.now();
        for (const r of removes) {
            r.ids.forEach(cupId => { view.vanishing[key(defender, cupId)] = now; });
            if (r.reason === 'islandStreak') { cheerCrowd(1); announce(t('stamp.sixCups'), 'island', '#ffe08a', 500); }
        }
        if (removes.length) { fx('remove'); await wait(id, 800); }
        if (runId.current !== id) return;
        for (const k of Object.keys(view.vanishing)) delete view.vanishing[k];
        const thrower = g.turn;
        roundsRef.current[thrower]++;
        if (thrower === 'opp' && ghostRef.current) { ghostRef.current.round++; ghostRef.current.used = 0; }
        gameRef.current = kindRef.current === 'run'
            // Beim Vorlegen wirft immer derselbe weiter, bis alle Becher weg sind
            ? { ...out.game, turn: 'me', catchUp: false, winner: null, nakedMile: null }
            : out.game;
        setRound(r => r + 1);
        view.mood = out.game.cups.opp.length <= 2 ? -0.5 : view.mood * 0.5;
        for (const e of out.events) {
            if (e.type === 'ballsBack') { cheerCrowd(0.85); announce(t('stamp.ballsBack'), 'trick', '#9be59b'); }
            // Nachziehen und Verlängerung gibt es beim Vorlegen nicht
            if (kindRef.current === 'run') continue;
            if (e.type === 'catchUp') announce(t('stamp.catchUp'), 'turn', '#8fd3ff');
            if (e.type === 'overtime') announce(t('stamp.overtime'), 'turn', '#ff9f43');
        }
        // Duell: Beide haben alles abgeräumt. Die Verlängerung spielt jeder für sich, der andere zieht danach gegen die Aufzeichnung nach.
        if (ghostRef.current && out.events.some(e => e.type === 'overtime')) overtimeSwitchRef.current = true;
        if (out.events.some(e => e.type === 'ballsBack' || (kindRef.current !== 'run' && (e.type === 'catchUp' || e.type === 'overtime')))) await wait(id, 1500);
    }, [announce, cheerCrowd, fx, t, wait]);

    // ---- Eine ganze Runde eines Spielers ----
    const playRound = useCallback(async (id: number) => {
        const view = viewRef.current!;
        const side = gameRef.current!.turn;
        fx('turn');
        if (side === 'opp') {
            setStatus(t('status.oppTurn', { name: view.names.opp }));
            // Der Computer darf die Becher stellen, die er treffen muss, und nimmt immer 1-1-2
            const slots = aiRearrangeSlots(gameRef.current!, rand);
            if (slots) {
                gameRef.current = rearrange(gameRef.current!, 'opp', slots);
                announce(t('stamp.rearranged'), 'turn', '#ffffff');
                await wait(id, 1100);
            } else await wait(id, 500);
        }
        while (runId.current === id && !roundOver(gameRef.current!)) {
            if (side === 'me') await myThrow(id, null); else await oppThrow(id, false);
            if (runId.current !== id) return;
            const g = gameRef.current!;
            if (canTrick(g)) {
                if (side === 'me') {
                    setControls({ trick: true, aim: false, hint: t('hint.trickChoice') });
                    setStatus(t('status.trickOffer'));
                    const choice = await input<Trick | 'skip' | undefined>();
                    setControls({ trick: false, hint: '' });
                    if (runId.current !== id || !choice) return;
                    if (choice === 'skip') gameRef.current = skipTrick(g);
                    else await myThrow(id, choice);
                } else if (ghostRef.current) {
                    // Aufzeichnung: war dort ein Trickshot, kommt er auch hier, sonst wird ausgelassen
                    const next = throwsOfRound(ghostRef.current.replay, ghostRef.current.round)[ghostRef.current.used];
                    if (next?.trick) await oppThrow(id, true); else gameRef.current = skipTrick(g);
                } else await oppThrow(id, true);
            }
        }
        if (runId.current === id) await finishRound(id);
    }, [announce, finishRound, fx, input, myThrow, oppThrow, setControls, t, wait]);

    // ---- Vorlegen allein: so lange werfen, bis alle Becher weg sind, und die Runden zählen ----
    // `send` schickt die Aufzeichnung ab (Duell vorlegen oder Verlängerung); das Ergebnis erscheint im Status
    const playSolo = useCallback(async (id: number, oppName: string, send: (replay: ReplayThrow[]) => Promise<{ success: boolean; error?: string }>, doneLabel: (replay: ReplayThrow[]) => string) => {
        const view = viewRef.current!;
        setStatus(overtimeRef.current ? t('status.overtimeRun') : t('status.lead'));
        while (runId.current === id && gameRef.current!.cups.opp.length > 0) await playRound(id);
        if (runId.current !== id) return;
        const rounds = roundsRef.current.me;
        view.ending = { start: performance.now() + 400, winner: 'me', nakedMile: null, winLabel: t('end.leadDone', { rounds }), mileLabel: '' };
        view.cheer = 1; view.mood = -1;
        fx('win');
        setControls({ ...IDLE, over: { won: true, mile: false } });
        setMode('over');
        setStatus(t('end.sending', { name: oppName }));
        const replay = logRef.current;
        const saved = await send(replay);
        if (runId.current !== id) return;
        setStatus(saved.success ? doneLabel(replay) : saved.error || t('end.sendFailed'));
    }, [fx, playRound, setControls, t]);

    // ---- Verlängerung im Duell: Beide haben alles abgeräumt, jetzt spiele ich meine drei Becher allein ----
    const playOvertimeRun = useCallback(async (id: number, oppName: string) => {
        const view = viewRef.current!;
        const ghost = ghostRef.current!;
        const rowId = ghost.duelId;
        const main = { rounds: roundsRef.current.me, hits: gameRef.current!.hits.me };
        overtimeRowRef.current = rowId;
        // ab jetzt gibt es keine Aufzeichnung des anderen mehr, ich lege selbst vor
        ghostRef.current = null;
        kindRef.current = 'run';
        overtimeRef.current = true;
        overtimeSwitchRef.current = false;
        roundsRef.current = { me: 0, opp: 0 };
        logRef.current = [];
        gameRef.current = newOvertimeGame('me', CUP_SIZES[sizeRef.current]);
        view.game = gameRef.current;
        view.ending = null; view.cheer = 0; view.mood = 0;
        setControls({ ...IDLE });
        announce(t('stamp.overtimeRun'), 'turn', '#ff9f43');
        await wait(id, 2200);
        if (runId.current !== id) return;
        await playSolo(id, oppName,
            replay => createOvertime(rowId, JSON.stringify(replay), main),
            replay => t('end.overtimeSent', { name: oppName, rounds: roundsOf(replay), hits: hitsOf(replay) }));
    }, [announce, playSolo, setControls, t, wait]);

    // ---- Ganzes Spiel ----
    const runGame = useCallback(async (id: number, starter: Side, oppName: string) => {
        const view = viewRef.current!;
        const kind = kindRef.current;
        const size = CUP_SIZES[sizeRef.current];
        gameRef.current = overtimeRef.current ? newOvertimeGame(kind === 'run' ? 'me' : starter, size) : newGame(kind === 'run' ? 'me' : starter, size);
        roundsRef.current = { me: 0, opp: 0 };
        logRef.current = [];
        overtimeSwitchRef.current = false;
        view.game = gameRef.current;
        setMode('play');
        setControls({ ...IDLE });
        view.enter = 1;
        announce(kind === 'run' ? t('stamp.lead') : overtimeRef.current ? t('stamp.overtime') : starter === 'me' ? t('stamp.youStart') : t('stamp.oppStarts', { name: oppName }), 'turn', '#ffe08a');
        await wait(id, 1400);

        if (kind === 'run') {
            const hands = handsRef.current;
            const target = targetPlayer.current;
            await playSolo(id, oppName,
                replay => target && hands
                    ? createDuel({ opponentPlayerId: target.id, cupSize: sizeRef.current, replay: JSON.stringify(replay), starter: starter === 'me' ? 'CHALLENGER' : 'OPPONENT', challengerHand: hands.mine, opponentHand: hands.theirs })
                    : Promise.resolve({ success: false as const, error: '' }),
                replay => t('end.sent', { name: oppName, rounds: roundsOf(replay), hits: hitsOf(replay) }));
            return;
        }

        while (runId.current === id && !gameRef.current!.winner && !overtimeSwitchRef.current) await playRound(id);
        if (runId.current !== id) return;
        // Duell: Beide haben alles abgeräumt, die Verlängerung wird einzeln gespielt
        if (overtimeSwitchRef.current && ghostRef.current) { await playOvertimeRun(id, oppName); return; }
        const g = gameRef.current!;
        const winner = g.winner!;
        const mile = g.nakedMile !== null;
        view.ending = {
            start: performance.now() + 400, winner, nakedMile: g.nakedMile,
            winLabel: winner === 'me' ? t('end.youWin') : t('end.oppWins', { name: oppName }),
            mileLabel: t('end.nakedMile', { name: g.nakedMile === 'me' ? t('end.you') : oppName }),
        };
        view.cheer = winner === 'me' ? 1 : 0;
        view.mood = winner === 'me' ? -1 : 0.4;
        cheerCrowd(1);
        fx(mile ? 'mile' : winner === 'me' ? 'win' : 'lose');
        setStatus(mile ? t('end.nakedMileHint') : '');
        setControls({ ...IDLE, over: { won: winner === 'me', mile } });
        setMode('over');

        // Ergebnis für die Statistik und den Herausforderer festhalten
        const rounds = roundsRef.current;
        const ghost = ghostRef.current;
        const saved = ghost
            ? await completeDuel(ghost.duelId, { won: winner === 'me', rounds: rounds.me, hits: g.hits.me, challengerRounds: rounds.opp, challengerHits: g.hits.opp, nakedMile: g.nakedMile })
            : await recordCpuGame({ difficulty: difficultyRef.current, cupSize: sizeRef.current, won: winner === 'me', rounds: rounds.me, hits: g.hits.me, opponentRounds: rounds.opp, opponentHits: g.hits.opp, nakedMile: g.nakedMile });
        if (runId.current === id && !saved.success) setStatus(t('end.saveFailed'));
        else if (runId.current === id && ghost) setStatus(t('end.duelSaved', { name: oppName }));
    }, [announce, cheerCrowd, fx, playOvertimeRun, playRound, playSolo, setControls, t, wait]);

    // ---- Start und Schnick, Schnack, Schnuck ----
    const begin = useCallback(async (oppName: string, kind: Kind, target: GamePlayer | null = null) => {
        // der Ton wird direkt aus dem Klick freigeschaltet
        try { await sharedGameAudio()?.resume(); } catch { /* ohne Ton weiter */ }
        const id = ++runId.current;
        kindRef.current = kind;
        // im Duell spielt der Nachziehende mit der Bechergröße des Herausforderers
        sizeRef.current = kind === 'ghost' && duel ? duel.cupSize : cupSize;
        targetPlayer.current = target;
        handsRef.current = null;
        ghostRef.current = kind === 'ghost' && duel ? { replay: duel.replay, round: 0, used: 0, duelId: duel.id } : null;
        overtimeRef.current = kind === 'ghost' && !!duel?.overtime;
        overtimeSwitchRef.current = false;
        overtimeRowRef.current = kind === 'ghost' && duel ? duel.id : null;
        const view: GameView = {
            primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#006b50',
            game: newGame('me'), names: { me: meName, opp: oppName },
            // Haut und Aussehen kommen aus den Figuren der Spieler
            skins: { me: lookFor(meName, 0, figures).skin ?? skinFor(meName), opp: lookFor(oppName, 0, figures).skin ?? skinFor(oppName) },
            looks: { me: lookFor(meName, 0, figures), opp: lookFor(oppName, 0, figures) },
            enter: 0, ball: null, trail: [], impacts: [], theme, crowdCheer: null, vanishing: {}, swipe: null, blind: false, islandCall: false, rearranging: null, stamps: [], status: '',
            throwPhase: 0, mood: 0, anger: 0, flinch: 0, cheer: 0, shake: 0, swat: null, ending: null, hand: null, midFlash: null,
            level: kind === 'cpu' ? t(`level.${difficultyRef.current}`) : null,
        };
        viewRef.current = view;
        gameRef.current = null;
        setOpponent(oppName);
        setMode('rps');
        setStatus(kind === 'ghost' ? t('rps.duelPrompt', { name: oppName }) : t('rps.prompt'));
        animate(id, 1500, k => { view.enter = k; });
        let starter: Side | null = null;
        if (kind === 'ghost' && duel?.overtime) {
            // Verlängerung: Schnick, Schnack, Schnuck gab es schon, wer anfängt steht fest
            starter = duel.starter === 'OPPONENT' ? 'me' : 'opp';
            setControls({ ...IDLE });
            await wait(id, 800);
        } else if (kind === 'ghost' && duel) {
            // Der Nachziehende wählt nicht: Seine Hand wurde schon zufällig bestimmt, das Ergebnis steht fest
            const mine = duel.opponentHand, theirs = duel.challengerHand;
            setControls({ ...IDLE });
            await wait(id, 1000);
            fx('hand');
            const shown = { mine, theirs };
            starter = duel.starter === 'OPPONENT' ? 'me' : 'opp';
            setControls({ rpsResult: shown });
            await wait(id, 1500);
            setControls({ rpsResult: { ...shown, line: starter === 'me' ? t('rps.youStart') : t('rps.oppStarts', { name: oppName }) } });
            await wait(id, 1500);
        }
        while (runId.current === id && !starter) {
            setControls({ ...IDLE, rps: true, rpsResult: null });
            const mine = await input<Hand | undefined>();
            if (runId.current !== id || !mine) return;
            // Der andere sitzt nicht am Tisch: Seine Hand wird zufällig gewählt
            const theirs = aiHand(rand);
            fx('hand');
            const winner = rockPaperScissors(mine, theirs);
            const shown = { mine, theirs };
            setControls({ rps: false, rpsResult: shown });
            await wait(id, 1500);
            if (winner) {
                starter = winner;
                handsRef.current = { mine, theirs };
                setControls({ rpsResult: { ...shown, line: winner === 'me' ? t('rps.youStart') : t('rps.oppStarts', { name: oppName }) } });
                await wait(id, 1500);
            } else {
                setControls({ rpsResult: { ...shown, line: t('rps.draw') } });
                await wait(id, 1100);
            }
        }
        if (starter && runId.current === id) await runGame(id, starter, oppName);
    }, [animate, cupSize, duel, figures, fx, input, meName, runGame, setControls, t, theme, wait]);

    useEffect(() => () => { runId.current++; const w = waiter.current; waiter.current = null; w?.(undefined); }, []);

    // ---- Zeichenschleife ----
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !ready || mode === 'pick') return;
        let frame = 0;
        const tick = (now: number) => {
            const view = viewRef.current;
            if (view) {
                view.shake = Math.max(0, view.shake - 0.04);
                if (view.flinch > 0) view.flinch = Math.max(0, view.flinch - 0.05);
                view.islandCall = ctlRef.current.islandOn;
                if (gameRef.current) view.game = gameRef.current;
                view.status = statusRef.current;
                drawGameFrame(ctx, view, now, { logo: logo.current });
            } else {
                ctx.fillStyle = '#0b1210';
                ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [ready, mode]);

    // ---- Eingabe ----
    const toCanvas = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
        const rect = event.currentTarget.getBoundingClientRect();
        return { x: ((event.clientX - rect.left) / rect.width) * SCENE_WIDTH, y: ((event.clientY - rect.top) / rect.height) * SCENE_HEIGHT };
    };

    const lastPoint = useRef<Point>({ x: 0, y: 0 });
    const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const point = toCanvas(event);
        lastPoint.current = point;
        const a = aim.current;
        event.currentTarget.setPointerCapture(event.pointerId);
        if (ctlRef.current.rearranging && gameRef.current && viewRef.current?.rearranging) {
            const g = gameRef.current;
            const bird = viewRef.current.rearranging;
            if (bird.closing !== null) return;
            const picked = bird.dragging;
            const cup = birdCupAt(g, point);
            if (cup !== null) { drag.current = { cupId: cup }; bird.dragging = cup; bird.dragPoint = null; return; }
            // erst einen Becher antippen, dann einen freien Platz: Der Becher wandert dorthin
            const slot = birdSlotAt(g, point);
            if (slot !== null && picked !== null) { gameRef.current = moveCup(g, 'me', picked, slot); bird.dragging = null; }
            return;
        }
        if (!a.waiting) return;
        a.active = true;
        a.samples = [{ ...point, t: event.timeStamp }];
        if (viewRef.current) viewRef.current.swipe = [point];
    };
    const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const point = toCanvas(event);
        lastPoint.current = point;
        if (drag.current) {
            // der Becher hängt am Finger, sobald er wirklich gezogen wird
            const bird = viewRef.current?.rearranging;
            if (bird) bird.dragPoint = point;
            return;
        }
        const a = aim.current;
        if (!a.waiting || !a.active) return;
        a.samples.push({ ...point, t: event.timeStamp });
        if (a.samples.length > 60) a.samples.shift();
        if (viewRef.current) viewRef.current.swipe = a.samples.map(({ x, y }) => ({ x, y }));
    };
    const release = () => {
        const a = aim.current;
        if (drag.current) {
            // Becher auf einen freien Platz ziehen und loslassen; sonst bleibt er ausgewählt und ein Antippen des Platzes genügt
            const g = gameRef.current;
            const bird = viewRef.current?.rearranging;
            const slot = g ? birdSlotAt(g, lastPoint.current) : null;
            if (g && slot !== null) { gameRef.current = moveCup(g, 'me', drag.current.cupId, slot); if (bird) bird.dragging = null; }
            if (bird) bird.dragPoint = null;
            drag.current = null;
            return;
        }
        if (!a.waiting || !a.active) return;
        a.active = false;
        const flick = flickLanding(a.samples);
        a.samples = [];
        if (viewRef.current) viewRef.current.swipe = null;
        // zu kurz oder zur Seite gewischt: kein Wurf, der Spieler darf es noch einmal versuchen
        if (!flick.ok) { setControls({ hint: flick.reason === 'short' ? t('hint.tooShort') : t('hint.tooSideways') }); return; }
        answer({ type: 'throw', point: flick.landing, bounce: ctlRef.current.bounceOn, island: ctlRef.current.islandOn } satisfies AimChoice);
    };

    // Nur in der Entwicklung: Tests werfen auf einen genauen Punkt, statt zu wischen
    useEffect(() => {
        if (process.env.NODE_ENV === 'production') return;
        const w = window as unknown as { __bpThrow?: (point: Point) => boolean; __bpGame?: () => Game | null };
        w.__bpGame = () => gameRef.current;
        w.__bpThrow = point => {
            if (!aim.current.waiting) return false;
            answer({ type: 'throw', point, bounce: ctlRef.current.bounceOn, island: ctlRef.current.islandOn, exact: true } satisfies AimChoice);
            return true;
        };
        return () => { delete w.__bpThrow; delete w.__bpGame; };
    }, [answer]);

    const replay = () => { if (opponent && kindRef.current !== 'ghost') { runId.current++; answer(undefined); void begin(opponent, kindRef.current, targetPlayer.current); } };
    const choose = () => { runId.current++; answer(undefined); viewRef.current = null; gameRef.current = null; ghostRef.current = null; overtimeRowRef.current = null; setStatus(''); setControls({ ...IDLE }); setMode('pick'); };

    const startDuel = (player: GamePlayer) => void begin(player.name, 'run', player);
    // Angenommen heißt: Ab jetzt zählt das Duell. Wer es verlässt oder neu lädt, hat aufgegeben
    const accept = async () => {
        if (!duel) return;
        setBusy(true);
        const started = await startDuelAction(duel.id);
        setBusy(false);
        if (!started.success) { await dialog.alert(t('duel.gone')); window.location.assign('/game'); return; }
        void begin(duel.challengerName, 'ghost');
    };
    const quit = async () => {
        const duelId = ghostRef.current?.duelId ?? overtimeRowRef.current;
        if (duelId && mode !== 'over') {
            if (!(await dialog.confirm(t('duel.quitConfirm'), { title: t('duel.quitTitle'), confirmLabel: t('duel.quitLabel'), danger: true }))) return;
            runId.current++; answer(undefined);
            await forfeitDuel(duelId);
            window.location.assign('/game');
            return;
        }
        choose();
    };
    const decline = async () => {
        if (!duel) return;
        setBusy(true);
        await declineDuel(duel.id);
        window.location.assign('/game');
    };

    // ---- Oberfläche ----
    if (mode === 'invite' && duel) {
        return (
            <div className="container page-content game-pick">
                <Link href={backHref} className="gp-back">&larr; {t('back')}</Link>
                <section className="gp-card gp-invite">
                    <span className="gp-avatar" style={{ background: lookFor(duel.challengerName, 0, figures).shirt }} aria-hidden="true">{duel.challengerName.slice(0, 1).toUpperCase()}</span>
                    <h1>{duel.overtime ? t('invite.overtimeTitle') : t('invite.title')}</h1>
                    <p>{duel.overtime ? t('invite.overtimeText', { name: duel.challengerName }) : t('invite.text', { name: duel.challengerName })}</p>
                    <p className="gp-sub">{duel.starter === 'OPPONENT' ? (duel.overtime ? t('invite.overtimeYouStart') : t('invite.youStart')) : (duel.overtime ? t('invite.overtimeTheyStart', { name: duel.challengerName }) : t('invite.theyStart', { name: duel.challengerName }))}</p>
                    <div className="gp-actions">
                        <button type="button" className="gp-button is-primary" disabled={!ready || busy} onClick={accept}>{t('invite.accept')}</button>
                        {/* eine Verlängerung gehört zu einem laufenden Duell: spielen oder (im Spiel) aufgeben, ablehnen geht nicht */}
                        {!duel.overtime && <button type="button" className="gp-button" disabled={busy} onClick={decline}>{t('invite.decline')}</button>}
                        <Link href="/game" className="gp-button">{t('invite.later')}</Link>
                    </div>
                </section>
            </div>
        );
    }

    if (mode === 'pick') {
        const segment = <T extends string>(label: string, items: readonly T[], current: T, onPick: (v: T) => void, text: (v: T) => string) => (
            <div className="gp-setting">
                <span className="gp-setting-label" id={`gp-${label}`}>{label}</span>
                <div className={`gp-segment${items.length > 3 ? ' is-four' : ''}`} role="radiogroup" aria-labelledby={`gp-${label}`}>
                    {items.map(item => (
                        <button key={item} type="button" role="radio" aria-checked={current === item} className={current === item ? 'is-on' : ''} onClick={() => onPick(item)}>{text(item)}</button>
                    ))}
                </div>
            </div>
        );
        return (
            <div className="container page-content game-pick">
                <Link href={backHref} className="gp-back">&larr; {t('back')}</Link>
                <header className="gp-hero">
                    <h1>{t('title')}</h1>
                    <p>{t('pickText')}</p>
                </header>

                {incoming.length > 0 && (
                    <section className="gp-card is-hot" aria-label={t('open.incoming')}>
                        <h2>{t('open.incoming')}</h2>
                        <ul className="gp-open">
                            {incoming.map(d => (
                                <li key={d.id}>
                                    <span className="gp-dot" style={{ background: lookFor(d.name, 0, figures).shirt }} aria-hidden="true" />
                                    <span className="gp-open-text">{d.overtime ? t('open.overtimeFrom', { name: d.name }) : t('open.from', { name: d.name })}</span>
                                    <Link href={`/game?duel=${d.id}`} className="gp-button is-primary is-small" aria-label={t('open.from', { name: d.name })}>{t('invite.open')}</Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                {outgoing.length > 0 && (
                    <section className="gp-card" aria-label={t('open.outgoing')}>
                        <h2>{t('open.outgoing')}</h2>
                        <ul className="gp-open is-quiet">
                            {outgoing.map(d => (
                                <li key={d.id}>
                                    <span className="gp-dot" style={{ background: lookFor(d.name, 0, figures).shirt }} aria-hidden="true" />
                                    <span className="gp-open-text">{d.overtime ? t('open.overtimeWaiting', { name: d.name }) : t('open.waiting', { name: d.name })}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <section className="gp-card">
                    <h2>{t('pickKind')}</h2>
                    <div className="gp-modes" role="radiogroup" aria-label={t('pickKind')}>
                        <button type="button" role="radio" aria-checked={pickKind === 'duel'} aria-label={t('kind.duel')} disabled={players.length === 0} className={pickKind === 'duel' ? 'is-on' : ''} onClick={() => setPickKind('duel')}>
                            <Swords size={26} aria-hidden="true" />
                            <strong>{t('kind.duel')}</strong>
                            <small>{t('kind.duelShort')}</small>
                        </button>
                        <button type="button" role="radio" aria-checked={pickKind === 'cpu'} aria-label={t('kind.cpu')} className={pickKind === 'cpu' ? 'is-on' : ''} onClick={() => setPickKind('cpu')}>
                            <Bot size={26} aria-hidden="true" />
                            <strong>{t('kind.cpu')}</strong>
                            <small>{t('kind.cpuShort')}</small>
                        </button>
                    </div>
                    <p className="gp-sub">{pickKind === 'duel' ? t('kind.duelText') : t('kind.cpuText')}</p>
                </section>

                <section className="gp-card">
                    <h2>{t('settings')}</h2>
                    {segment(t('cupSize'), ['small', 'medium', 'large'] as const, cupSize, chooseSize, v => t(`size.${v}`))}
                    {pickKind === 'cpu' && segment(t('difficulty'), ['easy', 'normal', 'hard', 'impossible'] as const, difficulty, setDifficulty, v => t(`level.${v}`))}
                </section>

                <section className="gp-card">
                    <h2>{t('pickTitle')}</h2>
                    {players.length === 0 ? <p className="gp-sub">{t('noPlayers')}</p> : (
                        <ul className="game-players gp-tiles">
                            {pickKind === 'cpu' && (
                                <li>
                                    <button type="button" className="gp-tile is-random" disabled={!ready} onClick={() => { const p = pick(players); void begin(p.name, 'cpu', p); }}>
                                        <Shuffle size={18} aria-hidden="true" />
                                        <span>{t('pickRandom')}</span>
                                    </button>
                                </li>
                            )}
                            {players.map(p => (
                                <li key={p.id}>
                                    <button type="button" className="gp-tile" disabled={!ready} onClick={() => (pickKind === 'duel' ? startDuel(p) : void begin(p.name, 'cpu', p))}>
                                        <span className="gp-dot" style={{ background: lookFor(p.name, 0, figures).shirt }} aria-hidden="true" />
                                        <span>{p.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {players.length === 0 && <button type="button" className="gp-button is-primary" disabled={!ready} onClick={() => void begin(t('cpuName'), 'cpu')}>{t('kind.cpu')}</button>}
                </section>
                <Link href="/rules" className="game-rules-link">{t('rulesLink')}</Link>
            </div>
        );
    }

    return (
        <div className="game">
            <canvas ref={canvasRef} className="game-canvas" width={SCENE_WIDTH} height={SCENE_HEIGHT} role="img" aria-label={status || t('title')}
                onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={release} onPointerCancel={release} />
            <p className="sr-only" aria-live="polite">{status}</p>
            <div className="game-top">
                <button type="button" className="wrapped-icon" aria-label={muted ? t('soundOn') : t('soundOff')} aria-pressed={!muted} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={22} /> : <Volume2 size={22} />}</button>
                <button type="button" className="wrapped-icon" aria-label={t('quit')} onClick={() => void quit()}><X size={24} /></button>
            </div>

            {/* Optionen für den nächsten Wurf am rechten Rand: schmale runde Knöpfe, damit der Tisch frei bleibt */}
            {ctl.aim && (
                <div className="game-side" role="group" aria-label={t('options')}>
                    {ctl.islandAvailable && (
                        <button type="button" className={`game-side-button${ctl.islandOn ? ' is-on' : ''}`} aria-pressed={ctl.islandOn} aria-label={`${t('island')} (${t('islandsLeft', { count: ctl.islandsLeft })})`} disabled={ctl.islandsLeft <= 0} onClick={() => setControls({ islandOn: !ctl.islandOn })}>
                            <span className="game-side-icon"><Mountain size={22} aria-hidden="true" /><span className="game-side-badge">{ctl.islandsLeft}</span></span>
                            <span className="game-side-label">{t('island')}</span>
                        </button>
                    )}
                    {ctl.bounceAvailable && (
                        <button type="button" className={`game-side-button${ctl.bounceOn ? ' is-on' : ''}`} aria-pressed={ctl.bounceOn} aria-label={t('bounce')} onClick={() => setControls({ bounceOn: !ctl.bounceOn })}>
                            <span className="game-side-icon"><ArrowDownToLine size={22} aria-hidden="true" /></span>
                            <span className="game-side-label">{t('bounceShort')}</span>
                        </button>
                    )}
                    {ctl.canRearrange && (
                        <button type="button" className="game-side-button" aria-label={`${t('rearrange')} (${t('rearrangeOnce')})`} onClick={() => answer({ type: 'rearrange' } satisfies AimChoice)}>
                            <span className="game-side-icon"><LayoutGrid size={22} aria-hidden="true" /></span>
                            <span className="game-side-label">{t('rearrangeShort')}</span>
                        </button>
                    )}
                </div>
            )}

            <div className="game-controls" data-round={round}>
                {ctl.hint && <p className="game-hint">{ctl.hint}</p>}
                {ctl.rpsResult && (() => {
                    const Mine = HAND_ICON[ctl.rpsResult.mine], Theirs = HAND_ICON[ctl.rpsResult.theirs];
                    return (
                        <p className="game-rps-result">
                            <span className="game-rps-hands"><Mine size={40} aria-label={t(`rps.${ctl.rpsResult.mine}`)} /> – <Theirs size={40} aria-label={t(`rps.${ctl.rpsResult.theirs}`)} /></span>
                            {ctl.rpsResult.line && <span>{ctl.rpsResult.line}</span>}
                        </p>
                    );
                })()}
                {ctl.rps && (
                    <div className="game-row">
                        {(['rock', 'paper', 'scissors'] as const).map(hand => (
                            <button key={hand} type="button" className="game-button is-hand" onClick={() => answer(hand)}>{(() => { const Icon = HAND_ICON[hand]; return <Icon size={32} aria-hidden="true" />; })()}{t(`rps.${hand}`)}</button>
                        ))}
                    </div>
                )}
                {ctl.rearranging && <div className="game-row"><button type="button" className="game-button is-strong" onClick={() => answer(undefined)}>{t('rearrangeDone')}</button></div>}
                {ctl.trick && (
                    <div className="game-row">
                        {(['eyes', 'leg', 'ceiling'] as const).map(kind => <button key={kind} type="button" className="game-button" onClick={() => answer(kind)}>{t(`trick.${kind}`)}</button>)}
                        <button type="button" className="game-button" onClick={() => answer('skip')}>{t('trick.skip')}</button>
                    </div>
                )}
                {ctl.swat && <div className="game-row"><button type="button" className="game-button is-strong is-big" onClick={() => answer('swat')}>{t('swat')}</button></div>}
                {ctl.over && (
                    <div className="game-row">
                        {kindRef.current !== 'ghost' && kindRef.current !== 'run' && <button type="button" className="game-button is-strong" onClick={replay}>{t('end.again')}</button>}
                        <button type="button" className="game-button" onClick={choose}>{t('end.otherOpponent')}</button>
                        <Link href="/rules" className="game-button">{t('end.rules')}</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
