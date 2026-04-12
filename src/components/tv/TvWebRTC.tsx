'use client';

import { useEffect, useRef, useState } from 'react';

const POLL_MS = 1500;
const CONNECT_TIMEOUT_MS = 30_000; // reset if ICE doesn't complete within 30s

async function fetchIceServers(): Promise<RTCIceServer[]> {
    try {
        const res = await fetch('/api/stream/ice-servers');
        const data = await res.json();
        return data.iceServers;
    } catch {
        return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
}

export default function TvWebRTC({ tournamentId }: { tournamentId: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Stable client ID for viewer-count tracking (one per tab, lives as long as component)
    const clientIdRef = useRef<string>(Math.random().toString(36).slice(2));
    const [status, setStatus] = useState<'waiting' | 'connecting' | 'connected' | 'retrying'>('waiting');
    const [muted, setMuted] = useState(true);
    const [videoTransform, setVideoTransform] = useState({ rotation: 0, zoom: 1, mirrored: false });
    const [viewerCount, setViewerCount] = useState(0);

    useEffect(() => {
        let offerApplied = false;
        let isConnecting = false; // guard against concurrent tryConnect calls
        let knownOfferCandidates = 0;
        let lastOfferId: string | null = null;

        function clearConnectTimer() {
            if (connectTimerRef.current) {
                clearTimeout(connectTimerRef.current);
                connectTimerRef.current = null;
            }
        }

        function resetState() {
            clearConnectTimer();
            pcRef.current?.close();
            pcRef.current = null;
            offerApplied = false;
            isConnecting = false;
            knownOfferCandidates = 0;
            lastOfferId = null;
        }

        async function tryConnect(offer: RTCSessionDescriptionInit) {
            if (isConnecting) return; // prevent concurrent attempts
            isConnecting = true;

            // Clean up old connection
            clearConnectTimer();
            pcRef.current?.close();
            pcRef.current = null;

            setStatus('connecting');
            const iceServers = await fetchIceServers();
            const pc = new RTCPeerConnection({ iceServers });
            pcRef.current = pc;

            pc.ontrack = ({ streams }) => {
                if (videoRef.current && streams[0]) {
                    videoRef.current.srcObject = streams[0];
                    // Muted autoplay is always allowed; unmute after user gesture via overlay
                    videoRef.current.muted = true;
                    videoRef.current.play().catch(() => {});
                }
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') {
                    clearConnectTimer();
                    setStatus('connected');
                }
                // 'disconnected' is transient and may self-recover — only reset on hard 'failed'
                if (pc.connectionState === 'failed') {
                    clearConnectTimer();
                    setStatus('retrying');
                    offerApplied = false;
                    isConnecting = false;
                    knownOfferCandidates = 0;
                    lastOfferId = null;
                }
            };

            pc.onicecandidate = ({ candidate }) => {
                if (candidate) {
                    fetch(`/api/stream/${tournamentId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'add-answer-candidate', data: candidate.toJSON() }),
                    });
                }
            };

            // Absolute fallback: if ICE never completes, reset after timeout
            connectTimerRef.current = setTimeout(() => {
                if (pc.connectionState !== 'connected') {
                    setStatus('retrying');
                    offerApplied = false;
                    isConnecting = false;
                    knownOfferCandidates = 0;
                    lastOfferId = null;
                    pc.close();
                    if (pcRef.current === pc) pcRef.current = null;
                }
            }, CONNECT_TIMEOUT_MS);

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await fetch(`/api/stream/${tournamentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set-answer', data: answer }),
            });

            offerApplied = true;
            isConnecting = false;
        }

        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/stream/${tournamentId}?viewer=${clientIdRef.current}`);
                const state = await res.json();

                // New offer arrived (or first offer)
                if (state.offer) {
                    const offerId = JSON.stringify(state.offer.sdp?.slice(0, 80));
                    const isNewOffer = offerId !== lastOfferId;
                    if (!isConnecting && (!offerApplied || isNewOffer)) {
                        lastOfferId = offerId;
                        offerApplied = false;
                        knownOfferCandidates = 0;
                        await tryConnect(state.offer);
                    }
                } else {
                    setStatus('waiting');
                    resetState();
                }

                // Sync video transform from broadcaster
                if (state.videoTransform) setVideoTransform(state.videoTransform);

                // Update viewer count
                if (typeof state.viewerCount === 'number') setViewerCount(state.viewerCount);

                // Apply new offer-side candidates
                if (offerApplied && state.offerCandidates.length > knownOfferCandidates) {
                    const newOnes = state.offerCandidates.slice(knownOfferCandidates);
                    for (const c of newOnes) {
                        try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(c)); } catch {}
                    }
                    knownOfferCandidates = state.offerCandidates.length;
                }
            } catch {}
        }, POLL_MS);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            clearConnectTimer();
            pcRef.current?.close();
        };
    }, [tournamentId]);

    const label = status === 'connected' ? null
        : status === 'connecting' ? 'Verbinde…'
        : status === 'retrying' ? 'Verbindung fehlgeschlagen, versuche erneut…'
        : 'Warte auf Streamer…';

    const sublabel = status === 'retrying'
        ? 'Prüfe ob Kamera-Seite offen ist und TURN konfiguriert'
        : status === 'waiting'
        ? 'Öffne die Kamera-Seite auf dem Streamer-Gerät'
        : null;

    function handleUnmute() {
        if (videoRef.current) {
            videoRef.current.muted = false;
            setMuted(false);
        }
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `rotate(${videoTransform.rotation}deg) scaleX(${videoTransform.mirrored ? -1 : 1}) scale(${videoTransform.zoom})`,
                    transformOrigin: 'center center',
                }}
            />
            {/* Viewer count badge — shown when connected */}
            {status === 'connected' && (
                <div style={{
                    position: 'absolute', top: '12px', left: '12px',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 10px',
                    background: 'rgba(0,0,0,0.55)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '16px',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backdropFilter: 'blur(6px)',
                    pointerEvents: 'none',
                }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    {viewerCount}
                </div>
            )}

            {/* Unmute overlay — shown when stream is live but muted */}
            {status === 'connected' && muted && (
                <button
                    onClick={handleUnmute}
                    style={{
                        position: 'absolute', bottom: '16px', right: '16px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px',
                        background: 'rgba(0,0,0,0.7)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        borderRadius: '20px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                    Ton aktivieren
                </button>
            )}
            {label && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '12px', color: 'var(--color-text-dim)',
                }}>
                    <div style={{
                        fontSize: '0.9rem', fontWeight: 600,
                        color: status === 'retrying' ? '#ef4444' : undefined,
                    }}>
                        {label}
                    </div>
                    {sublabel && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', textAlign: 'center', maxWidth: '280px' }}>
                            {sublabel}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
