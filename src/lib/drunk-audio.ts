import { WrappedAudio, audioSupported } from '@/lib/wrapped-audio';
import { DRUNK_TOTAL_MS, HICCUP_AT, HIT_AT, THROW_AT, THROW_MS } from '@/lib/drunk-scene';

// Ton für die Szene im Betrunken-Modus. Gleiche Bausteine wie bei Wrapped (Web Audio, keine Dateien),
// aber schief und wackelig: dieselben Akkorde, langsamer, mit absackenden Tönen.

// a-Moll, F-Dur, C-Dur, G-Dur wie im Wrapped
const BARS = [
    { bass: 110.0, chord: [440.0, 523.25, 659.25] },
    { bass: 87.31, chord: [349.23, 440.0, 523.25] },
    { bass: 130.81, chord: [523.25, 659.25, 783.99] },
    { bass: 98.0, chord: [392.0, 493.88, 587.33] },
];
const BEAT = 640;

export class DrunkAudio extends WrappedAudio {
    // Plant die Szene ab `fromMs` (0 = Anfang)
    scheduleDrunk(fromMs = 0) {
        this.stop();
        this.origin = this.ctx.currentTime + 0.08 - fromMs / 1000;
        this.scheduled = true;
        const at = (ms: number) => this.origin + ms / 1000;
        const due = (ms: number) => ms >= fromMs - 20;
        // je weiter die Szene, desto stärker sacken die Töne ab
        const woozy = (ms: number) => Math.min(1, Math.max(0, (ms - 3600) / 2400));

        // ---- Musik: gezupfte Akkorde, Bassdrum, am Ende schief ----
        const beats = Math.floor((DRUNK_TOTAL_MS - 900) / BEAT);
        for (let b = 0; b < beats; b++) {
            const ms = b * BEAT;
            const bar = BARS[Math.floor(b / 4) % BARS.length];
            const w = woozy(ms);
            for (let half = 0; half < 2; half++) {
                const t = ms + half * BEAT / 2;
                if (!due(t)) continue;
                const f = bar.chord[(b * 2 + half) % 3];
                // jeder Ton rutscht ein Stück nach unten, im Rausch immer mehr
                this.tone(this.music, at(t), f, 0.26, 'triangle', 0.16 * (1 - w * 0.4), f * (0.97 - w * 0.12));
            }
            if (ms >= 250) {
                if (due(ms)) this.tone(this.music, at(ms), 150, 0.2, 'sine', 0.8, 42);
                if (due(ms + BEAT / 2)) this.noise(this.music, at(ms + BEAT / 2), 0.05, 0.12, 'highpass', 7000);
            }
            if (ms >= THROW_AT - 640 && due(ms)) this.tone(this.music, at(ms), bar.bass * (1 - w * 0.1), 0.3, 'sawtooth', 0.26, undefined, 380);
        }
        // Schluss: Akkord sackt ab wie eine ausgehende Platte
        if (due(DRUNK_TOTAL_MS - 1500)) for (const f of [220, 261.63, 329.63]) this.tone(this.music, at(DRUNK_TOTAL_MS - 1500), f, 1.5, 'triangle', 0.14, f * 0.6);

        // ---- Effekte ----
        // torkelnd hereinkommen: Gluckern im Rhythmus des Schwankens
        [450, 950, 1550].forEach((ms, i) => { if (due(ms)) this.tone(this.sfx, at(ms), 340 - i * 30, 0.12, 'sine', 0.28, 170); });
        // Schluckauf: kurzes "Hic" mit Knacken
        for (const ms of HICCUP_AT) {
            if (due(ms)) { this.tone(this.sfx, at(ms), 460, 0.07, 'sine', 0.4, 250); this.noise(this.sfx, at(ms), 0.03, 0.2, 'highpass', 3000); }
            if (due(ms + 140)) this.tone(this.sfx, at(ms + 140), 330, 0.09, 'sine', 0.3, 520);
        }
        // Ausholen: Lasso-Pfeifen nach oben, wackelig
        if (due(THROW_AT - 480)) this.tone(this.sfx, at(THROW_AT - 480), 300, 0.48, 'sine', 0.22, 880);
        // Wurf in Schlangenlinien: Zischen und schaukelnde Töne
        if (due(THROW_AT)) this.noise(this.sfx, at(THROW_AT), THROW_MS / 1000, 0.18, 'bandpass', 500, 2200);
        for (let i = 0; i < 6; i++) {
            const ms = THROW_AT + 80 + i * 150;
            if (due(ms)) this.tone(this.sfx, at(ms), i % 2 ? 560 : 440, 0.12, 'triangle', 0.14);
        }
        // Treffer aufs Bild: harter Knack, dann zersplittert das Glas
        if (due(HIT_AT)) {
            this.noise(this.sfx, at(HIT_AT), 0.07, 0.5, 'highpass', 2500);
            this.tone(this.sfx, at(HIT_AT), 260, 0.12, 'sine', 0.45, 90);
            this.noise(this.sfx, at(HIT_AT + 30), 0.7, 0.3, 'highpass', 5200, 3200);
        }
        // viele helle Splitter, anfangs dicht, dann seltener; die letzten fallen tiefer und klirren nach
        for (let i = 0; i < 34; i++) {
            const ms = HIT_AT + 20 + Math.pow(i / 34, 1.6) * 1100;
            if (!due(ms)) continue;
            const pitch = 2400 + ((i * 937) % 4200) - i * 30;
            this.tone(this.sfx, at(ms), pitch, 0.05 + (i % 3) * 0.02, i % 2 ? 'sine' : 'triangle', 0.16 - i * 0.002, pitch * 0.85);
            if (i % 4 === 0) this.noise(this.sfx, at(ms), 0.04, 0.12, 'highpass', 6000);
        }
        [900, 1050, 1230].forEach((off, i) => {
            if (due(HIT_AT + off)) this.tone(this.sfx, at(HIT_AT + off), 1900 - i * 260, 0.18, 'sine', 0.12, 1500 - i * 200);
        });
        // Gegner ärgert sich: zischender Dampf, dann ein zorniges Knurren
        if (due(HIT_AT + 350)) this.noise(this.sfx, at(HIT_AT + 350), 0.9, 0.12, 'highpass', 3800, 2200);
        if (due(HIT_AT + 250)) this.tone(this.sfx, at(HIT_AT + 250), 118, 0.55, 'sawtooth', 0.28, 78, 520);
        if (due(HIT_AT + 330)) this.tone(this.sfx, at(HIT_AT + 330), 92, 0.5, 'square', 0.1, 70, 400);
        // "Daneben!"-Stempel
        const stamp = HIT_AT + 250;
        if (due(stamp)) { this.tone(this.sfx, at(stamp), 120, 0.3, 'sine', 0.7, 50); this.noise(this.sfx, at(stamp), 0.25, 0.3, 'lowpass', 2400, 300); }
        // traurige Posaune wie im Wrapped
        [233.08, 220, 207.65, 196].forEach((f, i) => {
            const ms = stamp + 500 + i * 330;
            const last = i === 3;
            if (due(ms)) this.tone(this.sfx, at(ms), f, last ? 0.9 : 0.3, 'sawtooth', 0.2, last ? f * 0.86 : undefined, 950);
        });
        // "Ups, sorry": zwei weiche Töne abwärts
        [523.25, 415.3].forEach((f, i) => {
            const ms = HIT_AT + 800 + i * 220;
            if (due(ms)) this.tone(this.sfx, at(ms), f, i ? 0.5 : 0.2, 'triangle', 0.2);
        });
    }

    // Kurzer, klarer Ton beim Ausschalten: wieder nüchtern
    playSober() {
        this.stop();
        this.origin = this.ctx.currentTime + 0.05;
        this.scheduled = true;
        const at = (ms: number) => this.origin + ms / 1000;
        this.noise(this.sfx, at(0), 0.25, 0.12, 'lowpass', 400, 1800);
        [523.25, 659.25, 783.99].forEach((f, i) => this.tone(this.sfx, at(120 + i * 110), f, i === 2 ? 0.7 : 0.2, 'triangle', 0.24));
    }
}

let shared: DrunkAudio | null = null;

export function sharedDrunkAudio(): DrunkAudio | null {
    if (!audioSupported()) return null;
    if (!shared || shared.ctx.state === 'closed') shared = new DrunkAudio();
    return shared;
}

// In einer Nutzeraktion aufrufen (Klick auf den Schalter), sonst bleibt der Browser stumm
export function primeDrunkAudio() {
    try { sharedDrunkAudio()?.resume(); } catch { /* ohne Ton weiter */ }
}
