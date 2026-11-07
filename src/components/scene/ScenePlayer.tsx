'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { X, Download, Video, Pause, RotateCcw, Square, Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { loadSceneFonts, SCENE_WIDTH, SCENE_HEIGHT, type SceneAssets } from '@/lib/wrapped-scene';
import { audioSupported, type WrappedAudio } from '@/lib/wrapped-audio';
import { canvasToFile, saveFiles } from '@/lib/wrapped-image';

const TAP_MS = 250;
const MUTE_KEY = 'wrapped-muted';
// Instagram-Storys brauchen MP4 mit H.264 und AAC; WebM ist nur die Ausweichlösung
const VIDEO_TYPES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];

function pickVideoType(): string | null {
    if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null;
    return VIDEO_TYPES.find(type => MediaRecorder.isTypeSupported(type)) ?? null;
}

// Eine Szene, die der Player abspielen kann: Zeichnen und Ton hängen nur von der Zeit ab.
// Das Objekt muss stabil sein (useMemo), sonst startet die Wiedergabe bei jedem Rendern neu.
export interface SceneSource {
    title: string;
    // Abschnitte: Schlüssel, Beginn und Dauer in ms, Text für Screenreader
    keys: string[];
    starts: number[];
    durations: number[];
    total: number;
    descriptions: string[];
    draw: (ctx: CanvasRenderingContext2D, timeMs: number, assets: SceneAssets) => void;
    // plant den Ton ab `fromMs` auf der übergebenen Instanz
    schedule: (audio: WrappedAudio, fromMs: number) => void;
    // gemeinsame Ton-Instanz dieser Szene (wird beim Tippen auf den Link freigeschaltet)
    audio: () => WrappedAudio | null;
    // Dateiname ohne Endung für Bild und Video
    fileBase: string;
}

// Player im Story-Format: tippen blättert, halten pausiert; Bild und Video lassen sich speichern
export default function ScenePlayer({ source, initialTime, closeHref }: { source: SceneSource; initialTime?: number; closeHref: string }) {
    const t = useTranslations('wrapped');
    const router = useRouter();
    const reducedMotion = useReducedMotion() ?? false;
    const { starts, durations, total } = source;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const time = useRef(initialTime ?? 0);
    const pressedAt = useRef(0);
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastNudge = useRef(0);
    const recorder = useRef<MediaRecorder | null>(null);
    const cancelled = useRef(false);
    const audio = useRef<WrappedAudio | null>(null);
    // Ton muss nach Springen, Pause oder Neustart neu an die Zeit gehängt werden
    const needsSync = useRef(true);

    const [mounted, setMounted] = useState(false);
    const [ready, setReady] = useState(false);
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(initialTime === undefined);
    const [held, setHeld] = useState(false);
    const [ended, setEnded] = useState(false);
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [muted, setMuted] = useState(false);
    const [soundOn, setSoundOn] = useState(false);
    const videoType = useMemo(() => (mounted ? pickVideoType() : null), [mounted]);
    const canSound = mounted && audioSupported();

    const indexAt = useCallback((ms: number) => {
        let i = 0;
        for (let k = 0; k < starts.length; k++) if (ms >= starts[k]) i = k;
        return i;
    }, [starts]);

    // Bild und Fortschrittsbalken für die aktuelle Zeit
    const paint = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        source.draw(ctx, time.current, {});
        const current = indexAt(time.current);
        fillRefs.current.forEach((el, i) => {
            if (!el) return;
            const p = i < current ? 1 : i > current ? 0 : Math.min(1, (time.current - starts[i]) / durations[i]);
            el.style.transform = `scaleX(${p})`;
        });
        setIndex(prev => (prev === current ? prev : current));
    }, [source, starts, durations, indexAt]);

    useEffect(() => {
        setMounted(true);
        try { setMuted(localStorage.getItem(MUTE_KEY) === '1'); } catch { /* kein Speicher verfügbar */ }
    }, []);

    useEffect(() => {
        if (!mounted) return;
        let alive = true;
        loadSceneFonts().then(() => {
            if (!alive) return;
            setReady(true);
            paint();
        });
        return () => { alive = false; };
    }, [mounted, paint]);

    // Hintergrund sperren, solange die Story offen ist; Ton beim Schließen beenden
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        // Ton übernehmen: Er wurde meist schon beim Tippen auf den Link freigeschaltet
        const sound = source.audio();
        if (sound) {
            audio.current = sound;
            sound.ctx.onstatechange = () => setSoundOn(sound.ctx.state === 'running');
            needsSync.current = true;
            // falls noch nicht: versuchen (klappt, wenn die Seite schon einmal berührt wurde)
            sound.resume().then(() => setSoundOn(sound.ctx.state === 'running'));
        }
        return () => {
            document.body.style.overflow = previous;
            // gemeinsame Instanz nicht schließen, nur anhalten
            if (sound) { sound.ctx.onstatechange = null; sound.stop(); sound.suspend(); }
            audio.current = null;
        };
    }, [source]);

    // Browser erlauben Ton erst nach einer Nutzeraktion; deshalb bei jedem Tippen versuchen
    const unlockAudio = useCallback(async () => {
        if (!audioSupported()) return null;
        if (!audio.current) {
            const created = source.audio();
            if (!created) return null;
            // der Browser meldet selbst, wann der Ton wirklich läuft
            created.ctx.onstatechange = () => setSoundOn(created.ctx.state === 'running');
            audio.current = created;
        }
        // resume() muss direkt in der Nutzeraktion aufgerufen werden, deshalb vor jedem await
        const resumed = audio.current.resume();
        // ab hier neu an die Bildzeit hängen, sonst startet der Ton nicht mitten in der Szene
        needsSync.current = true;
        await resumed;
        const on = audio.current.ctx.state === 'running';
        setSoundOn(on);
        return on ? audio.current : null;
    }, [source]);

    useEffect(() => { audio.current?.setMuted(muted); }, [muted, soundOn]);

    const finishRecording = useCallback(() => {
        if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
    }, []);

    // Wiedergabe
    useEffect(() => {
        if (!ready || !playing || held || (reducedMotion && !recording)) return;
        let frame = 0;
        let last = performance.now();
        const tick = (now: number) => {
            const sound = audio.current;
            // hängt der Ton, obwohl er laufen soll: etwa einmal pro Sekunde erneut anstoßen
            if (sound?.stalled && now - lastNudge.current > 1000) { lastNudge.current = now; sound.resume(); }
            if (sound && sound.ctx.state === 'running') {
                if (needsSync.current) { source.schedule(sound, time.current); needsSync.current = false; }
                // Bild folgt der Tonuhr, so bleiben beide synchron (auch im Video)
                time.current = Math.min(total, Math.max(time.current, sound.positionMs()));
            } else if (!document.hidden) {
                time.current = Math.min(total, time.current + (now - last));
            }
            last = now;
            paint();
            if (recording) setSeconds(Math.floor(time.current / 1000));
            if (time.current >= total) {
                setPlaying(false);
                setEnded(true);
                if (recording) finishRecording();
                return;
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [ready, playing, held, reducedMotion, recording, total, source, paint, finishRecording, soundOn]);

    // Halten und verdeckter Tab halten auch den Ton an
    useEffect(() => {
        const sound = audio.current;
        if (!sound) return;
        if (held || !playing) sound.suspend(); else sound.resume();
    }, [held, playing, soundOn]);

    useEffect(() => {
        const onVisibility = () => {
            const sound = audio.current;
            if (!sound) return;
            if (document.hidden) sound.suspend(); else if (playing && !held) sound.resume();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [playing, held]);

    const seek = useCallback((target: number) => {
        const i = Math.max(0, Math.min(starts.length - 1, target));
        // ohne Animation zeigt jeder Abschnitt sein Endbild
        time.current = reducedMotion ? starts[i] + durations[i] - 1 : starts[i];
        audio.current?.stop();
        needsSync.current = true;
        setEnded(false);
        setStatus(null);
        setPlaying(!reducedMotion);
        paint();
    }, [starts, durations, reducedMotion, paint]);

    useEffect(() => { if (ready && reducedMotion) seek(0); }, [ready, reducedMotion, seek]);

    const step = useCallback((direction: 1 | -1) => {
        if (recording) return;
        const current = indexAt(time.current);
        // zurück: erst den laufenden Abschnitt neu starten, dann den davor
        if (direction === -1 && !reducedMotion && time.current - starts[current] > 1200) return seek(current);
        seek(current + direction);
    }, [recording, indexAt, starts, reducedMotion, seek]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); step(1); }
            else if (e.key === 'ArrowLeft') step(-1);
            else if (e.key === 'Escape' && !recording) router.push(closeHref);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [step, router, recording, closeHref]);

    // kurz tippen = springen, gedrückt halten = anhalten
    const clearHold = () => {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        holdTimer.current = null;
        setHeld(false);
    };
    const press = () => {
        if (recording) return;
        pressedAt.current = performance.now();
        // erst nach kurzem Halten pausieren; ein Tippen soll weder Bild noch Ton anhalten
        if (holdTimer.current) clearTimeout(holdTimer.current);
        holdTimer.current = setTimeout(() => setHeld(true), TAP_MS);
    };
    const release = (direction: 1 | -1) => {
        if (recording) return;
        const tapped = performance.now() - pressedAt.current < TAP_MS;
        clearHold();
        // Handys erlauben Ton erst, wenn der Finger wieder oben ist (nicht schon beim Aufsetzen)
        if (!soundOn && !muted) unlockAudio();
        if (tapped) step(direction);
    };

    function toggleMute() {
        const next = !muted;
        setMuted(next);
        try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* kein Speicher verfügbar */ }
        if (!next) unlockAudio();
    }

    async function saveFrame() {
        if (!canvasRef.current) return;
        setBusy(true);
        try {
            const result = await saveFiles([await canvasToFile(canvasRef.current, `${source.fileBase}.png`)], source.title);
            setStatus(result === 'shared' ? t('shared') : result === 'downloaded' ? t('downloaded', { count: 1 }) : null);
        } catch {
            setStatus(t('saveFailed'));
        } finally {
            setBusy(false);
        }
    }

    async function recordVideo() {
        const canvas = canvasRef.current;
        if (!canvas || !videoType) { setStatus(t('videoUnsupported')); return; }
        // der Klick erlaubt dem Browser den Ton; das Video bekommt ihn auch bei stummem Lautsprecher
        const sound = await unlockAudio();
        const chunks: Blob[] = [];
        const video = canvas.captureStream(30);
        const stream = new MediaStream([...video.getVideoTracks(), ...(sound ? sound.stream.getAudioTracks() : [])]);
        const rec = new MediaRecorder(stream, { mimeType: videoType, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 128_000 });
        const container = videoType.split(';')[0];
        cancelled.current = false;
        rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        rec.onstop = async () => {
            video.getTracks().forEach(track => track.stop());
            recorder.current = null;
            setRecording(false);
            if (cancelled.current) { setStatus(null); return; }
            setBusy(true);
            try {
                const isMp4 = container === 'video/mp4';
                const file = new File([new Blob(chunks, { type: container })], `${source.fileBase}.${isMp4 ? 'mp4' : 'webm'}`, { type: container });
                const result = await saveFiles([file], source.title);
                const done = result === 'shared' ? t('videoShared') : result === 'downloaded' ? t('videoDownloaded') : null;
                // WebM nimmt Instagram nicht an
                setStatus(done && !isMp4 ? `${done} ${t('videoWebmHint')}` : done);
            } catch {
                setStatus(t('saveFailed'));
            } finally {
                setBusy(false);
            }
        };
        recorder.current = rec;
        // Aufnahme läuft die Szene einmal von vorn bis zum Ende durch
        time.current = 0;
        sound?.stop();
        needsSync.current = true;
        setEnded(false);
        setSeconds(0);
        setStatus(null);
        setRecording(true);
        paint();
        rec.start(250);
        setPlaying(true);
    }

    function cancelRecording() {
        cancelled.current = true;
        finishRecording();
        audio.current?.stop();
        needsSync.current = true;
        setPlaying(false);
    }

    if (!mounted) return null;

    const description = source.descriptions[index] ?? source.title;

    return createPortal(
        <div className="wrapped" role="dialog" aria-modal="true" aria-label={source.title}>
            <canvas ref={canvasRef} className="wrapped-canvas" width={SCENE_WIDTH} height={SCENE_HEIGHT} role="img" aria-label={description} />
            <p className="sr-only" aria-live="polite">{description}</p>

            <header className="wrapped-top">
                <div className="wrapped-progress" aria-hidden="true">
                    {source.keys.map((key, i) => (
                        <span key={key} className="wrapped-progress-track">
                            <span ref={el => { fillRefs.current[i] = el; }} className="wrapped-progress-fill" />
                        </span>
                    ))}
                </div>
                <div className="wrapped-top-row">
                    {held && !recording && <span className="wrapped-paused"><Pause size={14} aria-hidden="true" /> {t('paused')}</span>}
                    {canSound && !soundOn && !muted && !recording && !held && <span className="wrapped-paused"><Volume2 size={14} aria-hidden="true" /> {t('tapForSound')}</span>}
                    {recording && <span className="wrapped-recording"><span className="wrapped-recording-dot" aria-hidden="true" /> {t('recording', { seconds: `${seconds}/${Math.round(total / 1000)}` })}</span>}
                    {!recording && (
                        <>
                            {canSound && (
                                <button type="button" className="wrapped-icon" aria-label={muted ? t('soundOn') : t('soundOff')} title={muted ? t('soundOn') : t('soundOff')} aria-pressed={!muted} onClick={toggleMute}>
                                    {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                                </button>
                            )}
                            {videoType && <button type="button" className="wrapped-icon" aria-label={t('saveVideo')} title={t('saveVideo')} disabled={busy || !ready} onClick={recordVideo}><Video size={22} /></button>}
                            <button type="button" className="wrapped-icon" aria-label={t('saveFrame')} title={t('saveFrame')} disabled={busy || !ready} onClick={saveFrame}><Download size={22} /></button>
                            <button type="button" className="wrapped-icon" aria-label={t('close')} title={t('close')} onClick={() => router.push(closeHref)}><X size={24} /></button>
                        </>
                    )}
                </div>
            </header>

            {/* Tippflächen: links zurück, rechts weiter */}
            {!recording && (
                <>
                    <button type="button" className="wrapped-tap wrapped-tap-prev" aria-label={t('previous')}
                        onPointerDown={press} onPointerUp={() => release(-1)} onPointerLeave={clearHold} onPointerCancel={clearHold} onKeyDown={e => { if (e.key === 'Enter') step(-1); }} />
                    <button type="button" className="wrapped-tap wrapped-tap-next" aria-label={t('next')} disabled={index === starts.length - 1}
                        onPointerDown={press} onPointerUp={() => release(1)} onPointerLeave={clearHold} onPointerCancel={clearHold} onKeyDown={e => { if (e.key === 'Enter') step(1); }} />
                </>
            )}

            <footer className="wrapped-bottom">
                {recording && <p className="wrapped-status">{t('recordingHint')}</p>}
                {status && !recording && <p className="wrapped-status" role="status">{status}</p>}
                <div className="wrapped-actions">
                    {recording ? (
                        <button type="button" className="wrapped-button" onClick={cancelRecording}><Square size={16} aria-hidden="true" /> {t('cancelRecording')}</button>
                    ) : ended && (
                        <>
                            {videoType && (
                                <button type="button" className="wrapped-button is-strong" disabled={busy || !ready} onClick={recordVideo}>
                                    <Video size={18} aria-hidden="true" /> {t('saveVideo')}
                                </button>
                            )}
                            <button type="button" className="wrapped-button" disabled={busy || !ready} onClick={saveFrame}>
                                <Download size={18} aria-hidden="true" /> {t('saveFrame')}
                            </button>
                            <button type="button" className="wrapped-button" disabled={busy} onClick={() => seek(0)}>
                                <RotateCcw size={18} aria-hidden="true" /> {t('replay')}
                            </button>
                        </>
                    )}
                </div>
            </footer>
        </div>,
        document.body,
    );
}
