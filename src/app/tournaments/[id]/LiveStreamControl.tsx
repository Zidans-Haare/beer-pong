'use client';

import { useState, useTransition } from 'react';
import { setTournamentLiveStreamUrl } from '@/app/actions/tournaments';
import { Video, VideoOff, Loader2, ExternalLink } from 'lucide-react';

interface LiveStreamControlProps {
    tournamentId: string;
    initialUrl: string | null;
    isParticipant: boolean;
    isAdmin: boolean;
}

const WEBRTC_FLAG = '__webrtc__';


export default function LiveStreamControl({
    tournamentId,
    initialUrl,
    isParticipant,
    isAdmin,
}: LiveStreamControlProps) {
    const [isPending, startTransition] = useTransition();
    const [activeUrl, setActiveUrl] = useState<string | null>(initialUrl);
    const [error, setError] = useState<string | null>(null);
    if (!isParticipant && !isAdmin) return null;

    const isActive = !!activeUrl;

    function openBroadcastWindow() {
        window.open(
            `/tournaments/${tournamentId}/broadcast`,
            'beer-pong-broadcast',
            'width=480,height=800,toolbar=0,menubar=0,location=0,status=0,resizable=1'
        );
    }

    function handleStart() {
        setError(null);
        startTransition(async () => {
            const result = await setTournamentLiveStreamUrl(tournamentId, WEBRTC_FLAG);
            if (!result.success) {
                setError(result.error || 'Fehler beim Starten');
            } else {
                setActiveUrl(WEBRTC_FLAG);
                openBroadcastWindow();
            }
        });
    }

    function handleStop() {
        setError(null);
        startTransition(async () => {
            const result = await setTournamentLiveStreamUrl(tournamentId, null);
            if (!result.success) {
                setError(result.error || 'Fehler beim Beenden');
            } else {
                fetch(`/api/stream/${tournamentId}`, { method: 'DELETE' });
                setActiveUrl(null);
            }
        });
    }

    if (isActive) {
        return (
            <>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '0 12px',
                    height: '36px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    color: 'var(--color-error)',
                    fontWeight: 600,
                }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-error)', display: 'inline-block', boxShadow: '0 0 6px var(--color-error)' }} />
                    Live
                </div>
                <button
                    onClick={() => openBroadcastWindow()}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <ExternalLink size={15} />
                    Kamera
                </button>
                <button
                    onClick={handleStop}
                    disabled={isPending}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    {isPending ? <Loader2 size={15} className="animate-spin" /> : <VideoOff size={15} />}
                    Beenden
                </button>
                {error && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', alignSelf: 'center' }}>{error}</span>}
            </>
        );
    }

    return (
        <>

            <button
                onClick={handleStart}
                disabled={isPending}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
                {isPending ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
                Stream starten
            </button>
            {error && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', alignSelf: 'center' }}>{error}</span>}
        </>
    );
}
