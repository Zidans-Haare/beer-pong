'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, FlipHorizontal, Loader2, RefreshCw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

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
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        await fetch(`/api/stream/${tournamentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, data }),
        });
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

                    // Apply answer (or re-apply if TV retried and sent a new answer version)
                    if (state.answer && state.answerVersion !== appliedAnswerVersion && !isRestarting) {
                        await pc.setRemoteDescription(new RTCSessionDescription(state.answer));
                        appliedAnswerVersion = state.answerVersion;
                        knownAnswerCandidates = 0;
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

    const statusColor = status === 'connected' ? '#4ade80'
        : status === 'connecting' ? 'orange'
        : status === 'error' ? '#ef4444'
        : 'rgba(255,255,255,0.5)';

    const statusLabel = status === 'connected' ? '● Live — TV empfängt'
        : status === 'connecting' ? '◌ Warte auf TV…'
        : status === 'error' ? '✕ Fehler'
        : 'Bereit';

    const isRunning = status === 'connecting' || status === 'connected';

    return (
        <div
            onPointerDown={resetHideTimer}
            style={{
                position: 'fixed', inset: 0, background: '#000',
                display: 'flex', flexDirection: 'column',
                fontFamily: 'system-ui, sans-serif', color: '#fff', userSelect: 'none',
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
                padding: '14px 16px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                opacity: controlsVisible ? 1 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: controlsVisible ? 'auto' : 'none',
            }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: statusColor }}>
                    {statusLabel}
                </span>

                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                    {(QUALITY_PRESETS as any)[quality].height}p
                </span>
            </div>

            {/* Bottom controls */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '12px 16px 32px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                opacity: controlsVisible ? 1 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: controlsVisible ? 'auto' : 'none',
            }}>
                {/* Row 0: quality */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {(['low', 'medium', 'high'] as Quality[]).map(q => (
                        <button
                            key={q}
                            onClick={() => changeQuality(q)}
                            style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: quality === q ? '#fff' : 'rgba(255,255,255,0.15)',
                                color: quality === q ? '#000' : '#fff',
                                backdropFilter: 'blur(6px)',
                                transition: 'all 0.15s',
                            }}
                        >
                            {q === 'low' ? 'SD · 360p' : q === 'medium' ? 'HD · 720p' : 'FHD · 1080p'}
                        </button>
                    ))}
                </div>

                {/* Row 1: zoom + rotate */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))} style={iconBtn(false)} title="Rauszoomen">
                        <ZoomOut size={20} />
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '38px', textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
                        {zoom.toFixed(2)}x
                    </span>
                    <button onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))} style={iconBtn(false)} title="Reinzoomen">
                        <ZoomIn size={20} />
                    </button>

                    <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

                    <button onClick={() => setRotation(r => ((r + 90) % 360) as 0|90|180|270)} style={iconBtn(false)} title="Drehen">
                        <RotateCw size={20} />
                    </button>
                    <button onClick={() => setMirrored(m => !m)} style={iconBtn(mirrored)} title="Spiegeln">
                        <FlipHorizontal size={20} />
                    </button>
                    {hasMultipleCams && (
                        <button onClick={flipCamera} style={iconBtn(false)} title="Kamera wechseln">
                            <RefreshCw size={20} />
                        </button>
                    )}
                </div>

                {/* Row 2: main action */}
                {!isRunning ? (
                    <button onClick={start} style={mainBtn('#fff', '#000')} title="Stream starten">
                        <Camera size={28} />
                    </button>
                ) : (
                    <button onClick={stop} style={mainBtn('#ef4444', '#fff')} title="Stream beenden">
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
        width: 52, height: 52, borderRadius: '50%',
        background: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
        border: 'none', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: active ? '#000' : '#fff', backdropFilter: 'blur(6px)',
    };
}

function mainBtn(bg: string, color: string): React.CSSProperties {
    return {
        width: 72, height: 72, borderRadius: '50%',
        background: bg, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    };
}
