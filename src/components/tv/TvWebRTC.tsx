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
    const [status, setStatus] = useState<'waiting' | 'connecting' | 'connected' | 'retrying'>('waiting');

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
                const res = await fetch(`/api/stream/${tournamentId}`);
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

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
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
