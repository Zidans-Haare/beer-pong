import { WrappedAudio, audioSupported } from '@/lib/wrapped-audio';

// Töne des Minispiels. Gleiche Bausteine wie bei Wrapped und im Betrunken-Modus (Web Audio, keine Dateien),
// hier aber einzeln und sofort abgespielt statt entlang einer Zeitachse.

export type Fx =
    | 'throw' | 'plop' | 'rim' | 'miss' | 'bounce' | 'remove' | 'bomb' | 'island' | 'stamp'
    | 'strip' | 'dress' | 'swat' | 'trick' | 'win' | 'lose' | 'hand' | 'turn' | 'mile';

export class GameAudio extends WrappedAudio {
    fx(kind: Fx) {
        const t = this.ctx.currentTime + 0.01;
        const s = this.sfx;
        switch (kind) {
            case 'throw': this.noise(s, t, 0.5, 0.16, 'bandpass', 500, 2400); break;
            case 'plop':
                this.tone(s, t, 520, 0.14, 'sine', 0.45, 130);
                this.noise(s, t, 0.12, 0.22, 'highpass', 2600);
                this.tone(s, t + 0.06, 880, 0.3, 'triangle', 0.22);
                this.tone(s, t + 0.14, 1318.51, 0.4, 'triangle', 0.18);
                break;
            case 'rim': this.tone(s, t, 1480, 0.18, 'triangle', 0.3, 900); this.tone(s, t + 0.04, 2200, 0.12, 'sine', 0.14); break;
            case 'miss': this.tone(s, t, 300, 0.09, 'sine', 0.3, 170); this.tone(s, t + 0.22, 240, 0.07, 'sine', 0.16, 150); break;
            case 'bounce': this.tone(s, t, 420, 0.09, 'sine', 0.3, 260); this.tone(s, t + 0.13, 560, 0.1, 'sine', 0.3, 380); break;
            case 'remove': for (let i = 0; i < 3; i++) this.tone(s, t + i * 0.05, 700 + i * 140, 0.08, 'sine', 0.2, 1100 + i * 140); break;
            case 'bomb':
                this.tone(s, t, 110, 0.5, 'sine', 0.8, 38);
                this.noise(s, t, 0.5, 0.4, 'lowpass', 2400, 200);
                [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(s, t + 0.15 + i * 0.09, f, i === 3 ? 0.7 : 0.14, 'square', 0.13, undefined, 3200));
                break;
            case 'island': [783.99, 987.77, 1174.66].forEach((f, i) => this.tone(s, t + i * 0.08, f, 0.3, 'triangle', 0.24)); break;
            case 'stamp': this.tone(s, t, 120, 0.3, 'sine', 0.7, 50); this.noise(s, t, 0.2, 0.28, 'lowpass', 2400, 300); break;
            case 'strip': this.tone(s, t, 500, 0.5, 'sine', 0.3, 1500); this.tone(s, t + 0.55, 1500, 0.25, 'sine', 0.3, 700); break;
            case 'dress': [659.25, 880].forEach((f, i) => this.tone(s, t + i * 0.1, f, 0.25, 'triangle', 0.22)); break;
            case 'swat': this.noise(s, t, 0.16, 0.38, 'bandpass', 1200, 400); this.tone(s, t, 200, 0.12, 'sine', 0.5, 90); break;
            case 'trick': [1046.5, 1318.51, 1568, 2093].forEach((f, i) => this.tone(s, t + i * 0.06, f, 0.3, 'triangle', 0.18)); break;
            case 'win':
                [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(s, t + i * 0.12, f, i === 3 ? 0.9 : 0.16, 'square', 0.16, undefined, 3200));
                for (let i = 0; i < 4; i++) { this.tone(s, t + 0.7 + i * 0.35, 180, 0.25, 'sine', 0.3, 60); this.noise(s, t + 0.73 + i * 0.35, 0.5, 0.12, 'highpass', 4200); }
                break;
            case 'lose': [233.08, 220, 207.65, 196].forEach((f, i) => this.tone(s, t + i * 0.33, f, i === 3 ? 0.9 : 0.3, 'sawtooth', 0.16, i === 3 ? f * 0.86 : undefined, 950)); break;
            case 'hand': this.tone(s, t, 330, 0.08, 'square', 0.16, undefined, 1400); break;
            case 'turn': this.tone(s, t, 660, 0.12, 'triangle', 0.16); break;
            case 'mile': [392, 440, 392, 523.25, 392, 440, 392, 587.33].forEach((f, i) => this.tone(s, t + i * 0.16, f, 0.14, 'square', 0.12, undefined, 2400)); break;
        }
        // abgespielte Quellen nicht ewig mitschleppen
        if (this.sources.length > 80) this.sources = this.sources.slice(-40);
    }
}

let shared: GameAudio | null = null;

export function sharedGameAudio(): GameAudio | null {
    if (!audioSupported()) return null;
    if (!shared || shared.ctx.state === 'closed') shared = new GameAudio();
    return shared;
}
