import { BEAT_MS, THROW_MS, type SceneTimeline } from '@/lib/wrapped-scene';

// Ton für Bier Pong Wrapped: Musik und Effekte werden im Browser erzeugt (Web Audio),
// es gibt keine Audiodateien. Alles hängt an derselben Zeitachse wie das Bild.

type Wave = OscillatorType;

// Akkordfolge je Takt: a-Moll, F-Dur, C-Dur, G-Dur
const BARS = [
    { bass: 110.0, chord: [440.0, 523.25, 659.25] },
    { bass: 87.31, chord: [349.23, 440.0, 523.25] },
    { bass: 130.81, chord: [523.25, 659.25, 783.99] },
    { bass: 98.0, chord: [392.0, 493.88, 587.33] },
];

export class WrappedAudio {
    readonly ctx: AudioContext;
    private readonly master: GainNode;
    private readonly monitor: GainNode;
    private readonly music: GainNode;
    private readonly sfx: GainNode;
    private readonly recordOut: MediaStreamAudioDestinationNode;
    private readonly noiseBuffer: AudioBuffer;
    private sources: AudioScheduledSourceNode[] = [];
    // Kontextzeit, die Szenenzeit 0 entspricht
    private origin = 0;
    private scheduled = false;

    constructor() {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.value = -10; limiter.ratio.value = 6;
        this.master.connect(limiter);
        // Lautsprecher (stummschaltbar) und Aufnahme (immer mit Ton) getrennt
        this.monitor = this.ctx.createGain();
        limiter.connect(this.monitor).connect(this.ctx.destination);
        this.recordOut = this.ctx.createMediaStreamDestination();
        limiter.connect(this.recordOut);
        this.music = this.ctx.createGain();
        this.music.gain.value = 0.5;
        this.music.connect(this.master);
        this.sfx = this.ctx.createGain();
        this.sfx.gain.value = 0.95;
        this.sfx.connect(this.master);

        const length = this.ctx.sampleRate;
        this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }

    get stream(): MediaStream { return this.recordOut.stream; }
    get running(): boolean { return this.ctx.state === 'running' && this.scheduled; }
    // Szenenzeit in ms laut Tonuhr; damit laufen Bild und Ton synchron
    positionMs(): number { return (this.ctx.currentTime - this.origin) * 1000; }

    setMuted(muted: boolean) { this.monitor.gain.value = muted ? 0 : 1; }
    // resume() und suspend() laufen im Browser verzögert ab. Folgen beide kurz nacheinander, kann der
    // ältere Befehl zuletzt ankommen. Deshalb merken wir uns den gewünschten Zustand und gleichen nach
    // jedem Befehl ab, bis er erreicht ist.
    private wantRunning = false;

    private reconcile = () => {
        if (this.ctx.state === 'closed') return;
        if (this.wantRunning && this.ctx.state === 'suspended') this.ctx.resume().catch(() => undefined);
        else if (!this.wantRunning && this.ctx.state === 'running') this.ctx.suspend().catch(() => undefined);
    };

    // Muss für das erste Freischalten direkt in einer Nutzeraktion aufgerufen werden
    async resume() {
        this.wantRunning = true;
        if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => undefined);
        this.reconcile();
    }

    async suspend() {
        this.wantRunning = false;
        if (this.ctx.state === 'running') await this.ctx.suspend().catch(() => undefined);
        this.reconcile();
    }

    // true, wenn der Ton laufen soll, der Browser ihn aber (noch) angehalten hat
    get stalled(): boolean { return this.wantRunning && this.ctx.state === 'suspended'; }

    stop() {
        for (const source of this.sources) { try { source.stop(); } catch { /* schon beendet */ } source.disconnect(); }
        this.sources = [];
        this.scheduled = false;
    }

    async close() { this.stop(); await this.ctx.close().catch(() => undefined); }

    // ---- Bausteine ----
    private tone(dest: AudioNode, time: number, freq: number, duration: number, type: Wave, gain: number, slideTo?: number, cutoff?: number) {
        if (time < this.ctx.currentTime - 0.02) return;
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), time + duration);
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, time);
        env.gain.exponentialRampToValueAtTime(gain, time + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        let node: AudioNode = osc;
        if (cutoff) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass'; filter.frequency.value = cutoff;
            node = osc.connect(filter);
        }
        node.connect(env).connect(dest);
        osc.start(time); osc.stop(time + duration + 0.03);
        this.sources.push(osc);
    }

    private noise(dest: AudioNode, time: number, duration: number, gain: number, type: BiquadFilterType, freq: number, sweepTo?: number) {
        if (time < this.ctx.currentTime - 0.02) return;
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;
        source.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.setValueAtTime(freq, time);
        if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, time + duration);
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, time);
        env.gain.exponentialRampToValueAtTime(gain, time + Math.min(0.02, duration / 3));
        env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        source.connect(filter).connect(env).connect(dest);
        source.start(time); source.stop(time + duration + 0.03);
        this.sources.push(source);
    }

    // Plant Musik und Effekte ab `fromMs`; vorherige Planung wird verworfen
    schedule(tl: SceneTimeline, fromMs: number) {
        this.stop();
        this.origin = this.ctx.currentTime + 0.08 - fromMs / 1000;
        this.scheduled = true;
        const at = (ms: number) => this.origin + ms / 1000;
        const due = (ms: number) => ms >= fromMs - 20;
        const beat = BEAT_MS;

        // ---- Musik: baut sich mit der Handlung auf ----
        const beats = Math.ceil(tl.total / beat);
        for (let b = 0; b < beats; b++) {
            const ms = b * beat;
            // die letzten anderthalb Sekunden gehören dem Schlussakkord
            if (ms >= tl.total - 1600) break;
            const bar = BARS[Math.floor(b / 4) % BARS.length];
            const inFinal = ms >= tl.final;
            // gezupfte Akkordtöne in Achteln, von Anfang an
            for (let half = 0; half < 2; half++) {
                const t = ms + half * beat / 2;
                if (due(t)) this.tone(this.music, at(t), bar.chord[(b * 2 + half) % 3] * (ms >= tl.throwAt && half === 1 ? 2 : 1), 0.22, 'triangle', inFinal ? 0.12 : 0.16);
            }
            if (ms >= tl.setup && !inFinal) {
                // Bassdrum auf jeden Schlag, Hi-Hat dazwischen
                if (due(ms)) this.tone(this.music, at(ms), 150, 0.2, 'sine', 0.9, 42);
                if (due(ms + beat / 2)) this.noise(this.music, at(ms + beat / 2), 0.05, 0.16, 'highpass', 7000);
            }
            if (ms >= tl.throwAt && !inFinal) {
                // Clap auf 2 und 4, Bass in Achteln
                if (b % 2 === 1 && due(ms)) this.noise(this.music, at(ms), 0.11, 0.3, 'bandpass', 1700);
                for (let half = 0; half < 2; half++) {
                    const t = ms + half * beat / 2;
                    if (due(t)) this.tone(this.music, at(t), bar.bass * (half ? 2 : 1), 0.2, 'sawtooth', 0.34, undefined, 420);
                }
            }
        }
        // Schlussakkord
        if (due(tl.total - 1500)) for (const f of [220, 261.63, 329.63, 440]) this.tone(this.music, at(tl.total - 1500), f, 1.4, 'triangle', 0.14);

        // ---- Effekte ----
        // Tisch erscheint: tiefer Schwall
        if (due(150)) this.noise(this.sfx, at(150), 0.9, 0.12, 'lowpass', 300, 1800);
        // Becher bauen sich auf: aufsteigende Plopps
        tl.myCupPops.forEach((ms, i) => { if (due(ms)) this.tone(this.sfx, at(ms), 380 + i * 42, 0.09, 'sine', 0.3, 760 + i * 60); });
        tl.oppCupPops.forEach((ms, i) => { if (due(ms)) this.tone(this.sfx, at(ms), 620 + i * 36, 0.07, 'sine', 0.2, 1100 + i * 40); });
        // Gegner tritt auf: zwei tiefe Töne
        if (due(tl.oppEnter)) { this.tone(this.sfx, at(tl.oppEnter), 196, 0.16, 'square', 0.12, undefined, 900); this.tone(this.sfx, at(tl.oppEnter + 170), 146.83, 0.26, 'square', 0.12, undefined, 900); }
        // Würfe: Zischen, Platscher, "Ding"
        tl.throws.forEach((th, n) => {
            if (due(th.start)) this.noise(this.sfx, at(th.start), THROW_MS / 1000, 0.2, 'bandpass', 500, 2600);
            const hit = th.start + THROW_MS;
            if (due(hit)) {
                this.tone(this.sfx, at(hit), 520, 0.18, 'sine', 0.5, 130);
                this.noise(this.sfx, at(hit), 0.16, 0.3, 'highpass', 2600);
                // jeder weitere Treffer klingt einen Ton höher
                const base = 880 * Math.pow(2, n * 2 / 12);
                this.tone(this.sfx, at(hit + 60), base, 0.4, 'triangle', 0.3);
                this.tone(this.sfx, at(hit + 140), base * 1.5, 0.5, 'triangle', 0.24);
            }
        });
        // Fehlwurf des Gegners: Aufsetzer und Abpraller
        if (due(tl.oppThrow + 825)) this.tone(this.sfx, at(tl.oppThrow + 825), 300, 0.08, 'sine', 0.35, 170);
        if (due(tl.oppThrow + 1300)) this.tone(this.sfx, at(tl.oppThrow + 1300), 240, 0.07, 'sine', 0.2, 150);
        // Becher fallen um: Klappern und dumpfer Schlag
        for (let i = 0; i < 9; i++) {
            const ms = tl.topple + i * 70 + (i % 3) * 25;
            if (due(ms)) this.noise(this.sfx, at(ms), 0.07, 0.34, 'bandpass', 1400 + (i % 4) * 500);
        }
        if (due(tl.topple + 200)) this.tone(this.sfx, at(tl.topple + 200), 95, 0.4, 'sine', 0.6, 45);
        // traurige Posaune für den Gegner
        [233.08, 220, 207.65, 196].forEach((f, i) => {
            const ms = tl.win + 800 + i * 330;
            const last = i === 3;
            if (due(ms)) this.tone(this.sfx, at(ms), f, last ? 0.9 : 0.3, 'sawtooth', 0.2, last ? f * 0.86 : undefined, 950);
        });
        // Sieg-Stempel und Fanfare
        if (due(tl.stamp)) { this.tone(this.sfx, at(tl.stamp), 120, 0.3, 'sine', 0.7, 50); this.noise(this.sfx, at(tl.stamp), 0.25, 0.3, 'lowpass', 2400, 300); }
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            const ms = tl.stamp + 1250 + i * 120;
            if (due(ms)) this.tone(this.sfx, at(ms), f, i === 3 ? 0.9 : 0.16, 'square', 0.16, undefined, 3200);
        });
        // Abspann: heller Dreiklang zum Logo
        [659.25, 880, 1318.51].forEach((f, i) => {
            const ms = tl.outro + 250 + i * 110;
            if (Number.isFinite(ms) && due(ms)) this.tone(this.sfx, at(ms), f, i === 2 ? 1.1 : 0.3, 'triangle', 0.26);
        });
        // Feuerwerk: Knall und Knistern
        for (const ms of tl.fireworks) {
            if (!due(ms)) continue;
            this.tone(this.sfx, at(ms), 180, 0.25, 'sine', 0.3, 60);
            this.noise(this.sfx, at(ms + 40), 0.5, 0.14, 'highpass', 4200);
        }
    }
}

export function audioSupported(): boolean {
    return typeof window !== 'undefined' && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
}

// Eine gemeinsame Instanz: Sie wird schon beim Tippen auf den Wrapped-Link freigeschaltet
// und danach von der Story benutzt. So läuft der Ton ab dem ersten Bild.
let shared: WrappedAudio | null = null;

export function sharedWrappedAudio(): WrappedAudio | null {
    if (!audioSupported()) return null;
    if (!shared || shared.ctx.state === 'closed') shared = new WrappedAudio();
    return shared;
}

// In einer Nutzeraktion aufrufen (Klick oder Tippen). Browser erlauben Ton nur von dort aus.
export function primeWrappedAudio() {
    try { sharedWrappedAudio()?.resume(); } catch { /* ohne Ton weiter */ }
}
