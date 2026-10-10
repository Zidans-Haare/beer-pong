'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { X, Download, Video, Pause, RotateCcw, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { drawWrappedFrame, loadSceneFonts, segmentStarts, totalDuration, SEGMENT_MS, SCENE_WIDTH, SCENE_HEIGHT, type SceneModel } from '@/lib/wrapped-scene';
import { canvasToFile, saveFiles } from '@/lib/wrapped-image';

const TAP_MS = 250;
// bevorzugt MP4 (für Storys), sonst WebM
const VIDEO_TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];

function pickVideoType(): string | null {
    if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null;
    return VIDEO_TYPES.find(type => MediaRecorder.isTypeSupported(type)) ?? null;
}

export default function WrappedStory({ model, initialTime }: { model: SceneModel; initialTime?: number }) {
    const t = useTranslations('wrapped');
    const router = useRouter();
    const reducedMotion = useReducedMotion() ?? false;
    const starts = useMemo(() => segmentStarts(model), [model]);
    const total = useMemo(() => totalDuration(model), [model]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const time = useRef(initialTime ?? 0);
    const pressedAt = useRef(0);
    const recorder = useRef<MediaRecorder | null>(null);
    const cancelled = useRef(false);

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
    const videoType = useMemo(() => (mounted ? pickVideoType() : null), [mounted]);

    const segment = model.segments[index];

    const indexAt = useCallback((ms: number) => {
        let i = 0;
        for (let k = 0; k < starts.length; k++) if (ms >= starts[k]) i = k;
        return i;
    }, [starts]);

    // Bild und Fortschrittsbalken für die aktuelle Zeit
    const paint = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        drawWrappedFrame(ctx, model, time.current);
        const current = indexAt(time.current);
        fillRefs.current.forEach((el, i) => {
            if (!el) return;
            const p = i < current ? 1 : i > current ? 0 : Math.min(1, (time.current - starts[i]) / SEGMENT_MS[model.segments[i].key]);
            el.style.transform = `scaleX(${p})`;
        });
        setIndex(prev => (prev === current ? prev : current));
    }, [model, starts, indexAt]);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!mounted) return;
        let alive = true;
        loadSceneFonts().then(() => { if (alive) { setReady(true); paint(); } });
        return () => { alive = false; };
    }, [mounted, paint]);

    // Hintergrund sperren, solange die Story offen ist
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, []);

    const finishRecording = useCallback(() => {
        if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
    }, []);

    // Wiedergabe
    useEffect(() => {
        if (!ready || !playing || held || (reducedMotion && !recording)) return;
        let frame = 0;
        let last = performance.now();
        const tick = (now: number) => {
            if (!document.hidden) time.current = Math.min(total, time.current + (now - last));
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
    }, [ready, playing, held, reducedMotion, recording, total, paint, finishRecording]);

    const seek = useCallback((target: number) => {
        const i = Math.max(0, Math.min(model.segments.length - 1, target));
        // ohne Animation zeigt jeder Abschnitt sein Endbild
        time.current = reducedMotion ? starts[i] + SEGMENT_MS[model.segments[i].key] - 1 : starts[i];
        setEnded(false);
        setStatus(null);
        setPlaying(!reducedMotion);
        paint();
    }, [model, starts, reducedMotion, paint]);

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
            else if (e.key === 'Escape' && !recording) router.push('/');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [step, router, recording]);

    // kurz tippen = springen, gedrückt halten = anhalten
    const press = () => { if (recording) return; pressedAt.current = performance.now(); setHeld(true); };
    const release = (direction: 1 | -1) => {
        if (recording) return;
        setHeld(false);
        if (performance.now() - pressedAt.current < TAP_MS) step(direction);
    };

    async function saveFrame() {
        if (!canvasRef.current) return;
        setBusy(true);
        try {
            const result = await saveFiles([await canvasToFile(canvasRef.current, 'bierpong-wrapped.png')], model.title);
            setStatus(result === 'shared' ? t('shared') : result === 'downloaded' ? t('downloaded', { count: 1 }) : null);
        } catch {
            setStatus(t('saveFailed'));
        } finally {
            setBusy(false);
        }
    }

    function recordVideo() {
        const canvas = canvasRef.current;
        if (!canvas || !videoType) { setStatus(t('videoUnsupported')); return; }
        const chunks: Blob[] = [];
        const stream = canvas.captureStream(30);
        const rec = new MediaRecorder(stream, { mimeType: videoType, videoBitsPerSecond: 8_000_000 });
        cancelled.current = false;
        rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        rec.onstop = async () => {
            stream.getTracks().forEach(track => track.stop());
            recorder.current = null;
            setRecording(false);
            if (cancelled.current) { setStatus(null); return; }
            setBusy(true);
            try {
                const extension = videoType.startsWith('video/mp4') ? 'mp4' : 'webm';
                const file = new File([new Blob(chunks, { type: videoType.split(';')[0] })], `bierpong-wrapped.${extension}`, { type: videoType.split(';')[0] });
                const result = await saveFiles([file], model.title);
                setStatus(result === 'shared' ? t('videoShared') : result === 'downloaded' ? t('videoDownloaded') : null);
            } catch {
                setStatus(t('saveFailed'));
            } finally {
                setBusy(false);
            }
        };
        recorder.current = rec;
        // Aufnahme läuft die Szene einmal von vorn bis zum Ende durch
        time.current = 0;
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
        setPlaying(false);
    }

    if (!mounted) return null;

    const description = [segment.eyebrow, segment.value, segment.title, ...segment.lines].join('. ');

    return createPortal(
        <div className="wrapped" role="dialog" aria-modal="true" aria-label={model.title}>
            <canvas ref={canvasRef} className="wrapped-canvas" width={SCENE_WIDTH} height={SCENE_HEIGHT} role="img" aria-label={description} />
            <p className="sr-only" aria-live="polite">{description}</p>

            <header className="wrapped-top">
                <div className="wrapped-progress" aria-hidden="true">
                    {model.segments.map((s, i) => (
                        <span key={s.key} className="wrapped-progress-track">
                            <span ref={el => { fillRefs.current[i] = el; }} className="wrapped-progress-fill" />
                        </span>
                    ))}
                </div>
                <div className="wrapped-top-row">
                    {held && !recording && <span className="wrapped-paused"><Pause size={14} aria-hidden="true" /> {t('paused')}</span>}
                    {recording && <span className="wrapped-recording"><span className="wrapped-recording-dot" aria-hidden="true" /> {t('recording', { seconds: `${seconds}/${Math.round(total / 1000)}` })}</span>}
                    {!recording && (
                        <>
                            {videoType && <button type="button" className="wrapped-icon" aria-label={t('saveVideo')} title={t('saveVideo')} disabled={busy || !ready} onClick={recordVideo}><Video size={22} /></button>}
                            <button type="button" className="wrapped-icon" aria-label={t('saveFrame')} title={t('saveFrame')} disabled={busy || !ready} onClick={saveFrame}><Download size={22} /></button>
                            <button type="button" className="wrapped-icon" aria-label={t('close')} title={t('close')} onClick={() => router.push('/')}><X size={24} /></button>
                        </>
                    )}
                </div>
            </header>

            {/* Tippflächen: links zurück, rechts weiter */}
            {!recording && (
                <>
                    <button type="button" className="wrapped-tap wrapped-tap-prev" aria-label={t('previous')}
                        onPointerDown={press} onPointerUp={() => release(-1)} onPointerLeave={() => setHeld(false)} onKeyDown={e => { if (e.key === 'Enter') step(-1); }} />
                    <button type="button" className="wrapped-tap wrapped-tap-next" aria-label={t('next')} disabled={index === model.segments.length - 1}
                        onPointerDown={press} onPointerUp={() => release(1)} onPointerLeave={() => setHeld(false)} onKeyDown={e => { if (e.key === 'Enter') step(1); }} />
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
