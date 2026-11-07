'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Camera, CameraOff, FlipHorizontal, Loader2, RefreshCw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const POLL_MS = 1500;

const QUALITY_PRESETS = {
    low:    { label: 'Niedrig',  width: 640,  height: 360,  frameRate: 15, bitrate: 400_000 },
    medium: { label: 'Mittel',   width: 1280, height: 720,  frameRate: 25, bitrate: 1_200_000 },
    high:   { label: 'Hoch',     width: 1920, height: 1080, frameRate: 30, bitrate: 3_000_000 },
} as const;
type Quality = keyof typeof QUALITY_PRESETS;

async function fetchIceServers(): Promise<RTCIceServer[]> {
    try {
        const res = await fetch('/api/stream/ice-servers');
        const data = await res.json();
        return data.iceServers;
    } catch {
        return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
}

type Status = 'idle' | 'connecting' | 'connected' | 'error';

export default function BroadcastPage({ params }: { params: Promise<{ id: string }> }) {
    const t = useTranslations('broadcast');
    const [tournamentId, setTournamentId] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);
    const [mirrored, setMirrored] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [hasMultipleCams, setHasMultipleCams] = useState(false);
    const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
    const [zoom, setZoom] = useState(1);

    const [quality, setQuality] = useState<Quality>('medium');
    const [controlsVisible, setControlsVisible] = useState(true);
    const [viewerCount, setViewerCount] = useState(0);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const transformTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { params.then(p => setTournamentId(p.id)); }, [params]);

    const resetHideTimer = useCallback(() => {
        setControlsVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
    }, []);

    useEffect(() => {
        resetHideTimer();
        return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
    }, [resetHideTimer]);

    // Auto-start stream as soon as tournamentId is available
    useEffect(() => {
        if (tournamentId) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournamentId]);

    const signal = useCallback(async (action: string, data: unknown) => {
        if (!tournamentId) return;
        const res = await fetch(`/api/stream/${tournamentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, data }),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => res.status.toString());
            throw new Error(`Signal ${action} failed: ${res.status} ${text}`);
        }
    }, [tournamentId]);

    // Debounced: send transform to server so TV can mirror it
    const signalTransform = useCallback((rotation: number, zoom: number, mirrored: boolean) => {
        if (!tournamentId) return;
        if (transformTimerRef.current) clearTimeout(transformTimerRef.current);
        transformTimerRef.current = setTimeout(() => {
            fetch(`/api/stream/${tournamentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set-transform', data: { rotation, zoom, mirrored } }),
            }).catch(() => {});
        }, 150);
    }, [tournamentId]);

    const start = useCallback(async () => {
        if (!tournamentId) return;
        setError(null);
        setStatus('connecting');

        const preset = (QUALITY_PRESETS as any)[quality];

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            setHasMultipleCams(devices.filter(d => d.kind === 'videoinput').length > 1);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width:     { ideal: preset.width },
                    height:    { ideal: preset.height },
                    frameRate: { ideal: preset.frameRate },
                },
                audio: true,
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;

            const iceServers = await fetchIceServers();
            const pc = new RTCPeerConnection({ iceServers });
            pcRef.current = pc;

            stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));

            // Apply max bitrate to video sender
            pc.onnegotiationneeded = async () => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    const params = sender.getParameters();
                    if (!params.encodings?.length) params.encodings = [{}];
                    params.encodings[0].maxBitrate = preset.bitrate;
                    await sender.setParameters(params).catch(() => {});
                }
            };

            pc.onicecandidate = ({ candidate }) => {
                if (candidate) signal('add-offer-candidate', candidate.toJSON());
            };

            let appliedAnswerVersion = -1;
            let knownAnswerCandidates = 0;
            let isRestarting = false;

            async function doIceRestart() {
                if (isRestarting || !pcRef.current) return;
                isRestarting = true;
                try {
                    const newOffer = await pc.createOffer({ iceRestart: true });
                    await pc.setLocalDescription(newOffer);
                    await signal('set-offer', newOffer);
                    appliedAnswerVersion = -1;
                    knownAnswerCandidates = 0;
                } catch {}
                isRestarting = false;
            }

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') {
                    setStatus('connected');
                    isRestarting = false;
                }
                // 'disconnected' is transient and may self-recover — only restart on hard 'failed'
                if (pc.connectionState === 'failed') {
                    setStatus('connecting');
                    doIceRestart();
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await signal('set-offer', offer);

            pollRef.current = setInterval(async () => {
                try {
                    const res = await fetch(`/api/stream/${tournamentId}`);
                    const state = await res.json();

                    if (typeof state.viewerCount === 'number') setViewerCount(state.viewerCount);

                    // Apply answer — or ICE-restart if a new viewer arrived after a prior connection
                    if (state.answer && state.answerVersion !== appliedAnswerVersion && !isRestarting) {
                        if (appliedAnswerVersion >= 0) {
                            // New TV viewer joined while we already had an active session.
                            // Can't setRemoteDescription(answer) without a fresh offer —
                            // trigger ICE restart so both sides exchange new candidates.
                            doIceRestart();
                        } else {
                            await pc.setRemoteDescription(new RTCSessionDescription(state.answer));
                            appliedAnswerVersion = state.answerVersion;
                            knownAnswerCandidates = 0;
                        }
                    }
                    if (appliedAnswerVersion >= 0 && state.answerCandidates.length > knownAnswerCandidates) {
                        for (const c of state.answerCandidates.slice(knownAnswerCandidates)) {
                            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                        }
                        knownAnswerCandidates = state.answerCandidates.length;
                    }
                } catch {}
            }, POLL_MS);

        } catch (e: any) {
            setStatus('error');
            setError(e?.message?.includes('Permission')
                ? 'Kamera-Zugriff verweigert. Bitte Erlaubnis in der Browser-Adressleiste erteilen.'
                : `Fehler: ${e?.message}`);
        }
    }, [tournamentId, facingMode, quality, signal]);

    const stop = useCallback(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        pcRef.current?.close(); pcRef.current = null;
        streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        if (tournamentId) signal('clear', null);
        setStatus('idle');
    }, [tournamentId, signal]);

    const flipCamera = useCallback(() => {
        const next = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(next);
        if (status === 'connecting' || status === 'connected') {
            stop();
            setTimeout(() => start(), 300);
        }
    }, [facingMode, status, stop, start]);

    const changeQuality = useCallback(async (q: Quality) => {
        setQuality(q);
        if (status !== 'connected' && status !== 'connecting') return;
        // Replace video track on existing PeerConnection
        const preset = QUALITY_PRESETS[q];
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: preset.width }, height: { ideal: preset.height }, frameRate: { ideal: preset.frameRate } },
                audio: false,
            });
            const newTrack = newStream.getVideoTracks()[0];
            const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(newTrack);
                const params = sender.getParameters();
                if (params.encodings?.length) {
                    params.encodings[0].maxBitrate = preset.bitrate;
                    await sender.setParameters(params).catch(() => {});
                }
            }
            // Update local preview
            streamRef.current?.getVideoTracks().forEach(t => t.stop());
            if (videoRef.current) {
                const audio = streamRef.current?.getAudioTracks()[0];
                const combined = new MediaStream([newTrack, ...(audio ? [audio] : [])]);
                streamRef.current = combined;
                videoRef.current.srcObject = combined;
            }
        } catch {}
    }, [status, facingMode]);

    useEffect(() => () => { stop(); }, [stop]);

    const statusColor = status === 'connected' ? "#08754b"
        : status === 'connecting' ? 'var(--color-warning)'
        : status === 'error' ? 'var(--color-error)'
        : 'var(--color-text-dim)';

    const statusLabel = status === 'connected'
        ? `● Live${viewerCount > 0 ? ` · ${viewerCount} Zuschauer` : ' — TV empfängt'}`
        : status === 'connecting' ? '◌ Warte auf TV…'
        : status === 'error' ? '✕ Fehler'
        : 'Bereit';

    const isRunning = status === 'connecting' || status === 'connected';

    return (
        <div className="broadcast-screen"
            onPointerDown={resetHideTimer}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--color-bg)',
                display: 'flex', flexDirection: 'column',
                fontFamily: 'var(--font-family)', color: 'var(--color-text)', userSelect: 'none',
            }}
        >
            {/* Camera preview */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#111' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transform: `rotate(${rotation}deg) scaleX(${mirrored ? -1 : 1}) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s',
                }} />
            </div>

            {/* Top bar: status + quality selector */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                padding: 'max(10px, env(safe-area-inset-top)) 16px 10px',
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                opacity: controlsVisible ? 1 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: controlsVisible ? 'auto' : 'none',
            }}>
                {tournamentId && <Link href={`/tournaments/${tournamentId}`} className="icon-button" aria-label={t('back')}><ArrowLeft size={22} /></Link>}
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: statusColor }}>
                    {statusLabel}
                </span>

                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-dim)' }}>
                    {(QUALITY_PRESETS as any)[quality].height}p
                </span>
            </div>

            {/* Bottom controls */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '12px 16px max(16px, env(safe-area-inset-bottom))',
                background: 'var(--color-surface)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                opacity: controlsVisible ? 1 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: controlsVisible ? 'auto' : 'none',
            }}>
                {/* Row 0: quality */}
                <div className="broadcast-quality">
                    {(['low', 'medium', 'high'] as Quality[]).map(q => (
                        <button
                            key={q}
                            type="button"
                            aria-pressed={quality === q}
                            onClick={() => changeQuality(q)}
                            style={{
                                minHeight: '48px',
                                padding: '8px 6px',
                                borderRadius: "6px",
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: quality === q ? 'var(--color-primary-light)' : 'var(--color-surface-secondary)',
                                color: quality === q ? 'var(--color-primary)' : 'var(--color-text-dim)',
                                backdropFilter: "none",
                                transition: 'all 0.15s',
                            }}
                        >
                            {q === 'low' ? 'SD · 360p' : q === 'medium' ? 'HD · 720p' : 'FHD · 1080p'}
                        </button>
                    ))}
                </div>

                {/* Row 1: zoom + rotate */}
                <div className="broadcast-tools">
                    <button onClick={() => setZoom(z => { const n = Math.max(1, +(z - 0.25).toFixed(2)); signalTransform(rotation, n, mirrored); return n; })} style={iconBtn(false)} title={t('zoomOut')} aria-label={t('zoomOut')}>
                        <ZoomOut size={20} />
                    </button>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, minWidth: '38px', textAlign: 'center', color: 'var(--color-text)' }}>
                        {zoom.toFixed(2)}x
                    </span>
                    <button onClick={() => setZoom(z => { const n = Math.min(4, +(z + 0.25).toFixed(2)); signalTransform(rotation, n, mirrored); return n; })} style={iconBtn(false)} title={t('zoomIn')} aria-label={t('zoomIn')}>
                        <ZoomIn size={20} />
                    </button>

                    <div style={{ width: 1, height: 28, background: 'var(--color-border)', margin: '0 4px' }} />

                    <button onClick={() => setRotation(r => { const n = ((r + 90) % 360) as 0|90|180|270; signalTransform(n, zoom, mirrored); return n; })} style={iconBtn(false)} title={t('rotate')} aria-label={t('rotate')}>
                        <RotateCw size={20} />
                    </button>
                    <button onClick={() => setMirrored(m => { signalTransform(rotation, zoom, !m); return !m; })} style={iconBtn(mirrored)} title={t('mirror')} aria-label={t('mirror')} aria-pressed={mirrored}>
                        <FlipHorizontal size={20} />
                    </button>
                    {hasMultipleCams && (
                        <button onClick={flipCamera} style={iconBtn(false)} title={t('flip')} aria-label={t('flip')}>
                            <RefreshCw size={20} />
                        </button>
                    )}
                </div>

                {/* Row 2: main action */}
                {!isRunning ? (
                    <button onClick={start} style={mainBtn('var(--color-primary)', '#fff')} title={t('start')} aria-label={t('start')}>
                        <Camera size={28} />
                    </button>
                ) : (
                    <button onClick={stop} style={mainBtn('var(--color-error)', '#fff')} title={t('stop')} aria-label={t('stop')}>
                        {status === 'connecting'
                            ? <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                            : <CameraOff size={28} />}
                    </button>
                )}
            </div>

            {error && (
                <div style={{
                    position: 'absolute', top: '60px', left: '16px', right: '16px',
                    background: 'rgba(239,68,68,0.92)', borderRadius: '10px',
                    padding: '12px 16px', fontSize: '0.85rem', lineHeight: 1.4,
                }}>
                    {error}
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function iconBtn(active: boolean): React.CSSProperties {
    return {
        width: 48, height: 48, borderRadius: '6px',
        background: active ? 'var(--color-primary-light)' : 'var(--color-surface-secondary)',
        border: 'none', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: active ? 'var(--color-primary)' : 'var(--color-text-dim)', backdropFilter: "none",
    };
}

function mainBtn(bg: string, color: string): React.CSSProperties {
    return {
        width: 72, height: 72, borderRadius: '50%',
        background: bg, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, boxShadow: "none",
    };
}
