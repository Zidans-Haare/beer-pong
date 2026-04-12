'use client';

import { useState, useTransition } from 'react';
import { setTournamentLiveStreamUrl } from '@/app/actions/tournaments';
import { Video, VideoOff, Loader2, ExternalLink } from 'lucide-react';

interface LiveStreamControlProps {
    tournamentId: string;
    initialUrl: string | null;
    isHost: boolean;
    isAdmin: boolean;
}

const WEBRTC_FLAG = '__webrtc__';

export default function LiveStreamControl({
    tournamentId,
    initialUrl,
    isHost,
    isAdmin,
}: LiveStreamControlProps) {
    const [isPending, startTransition] = useTransition();
    const [activeUrl, setActiveUrl] = useState<string | null>(initialUrl);
    const [error, setError] = useState<string | null>(null);

    const canControl = isHost || isAdmin;
    if (!canControl) return null;

    const isActive = !!activeUrl;

    function openBroadcastWindow() {
        window.open(`/tournaments/${tournamentId}/broadcast`, '_blank');
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
                <button
                    onClick={openBroadcastWindow}
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
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-error)' }}
                >
                    {isPending ? <Loader2 size={15} className="animate-spin" /> : <VideoOff size={15} />}
                    Beenden
                </button>
                {error && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>{error}</span>}
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
            {error && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>{error}</span>}
        </>
    );
}
