'use client';

import { useState, useTransition } from 'react';
import { setTournamentLiveStreamUrl } from '@/app/actions/tournaments';
import { Video, VideoOff, Loader2, ExternalLink, Tv } from 'lucide-react';
import Link from 'next/link';

interface LiveStreamControlProps {
    tournamentId: string;
    initialUrl: string | null;
    canStart: boolean;
    canStop: boolean;
    /** If provided, renders a full-width TV button as second row */
    tvHref?: string;
}

const WEBRTC_FLAG = '__webrtc__';

const fullBtn: React.CSSProperties = {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
};

export default function LiveStreamControl({
    tournamentId,
    initialUrl,
    canStart,
    canStop,
    tvHref,
}: LiveStreamControlProps) {
    const [isPending, startTransition] = useTransition();
    const [activeUrl, setActiveUrl] = useState<string | null>(initialUrl);
    const [error, setError] = useState<string | null>(null);

    const isActive = !!activeUrl;

    function openBroadcastWindow() {
        window.open(`/tournaments/${tournamentId}/broadcast`, '_blank');
    }

    function handleStart() {
        setError(null);
        // Open the broadcast window SYNCHRONOUSLY on the user click event
        // (iOS Safari blocks window.open() when called after an async gap)
        const win = window.open(`/tournaments/${tournamentId}/broadcast`, '_blank');
        startTransition(async () => {
            const result = await setTournamentLiveStreamUrl(tournamentId, WEBRTC_FLAG);
            if (!result.success) {
                win?.close();
                setError(result.error || 'Fehler beim Starten');
            } else {
                setActiveUrl(WEBRTC_FLAG);
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

    const tvButton = tvHref ? (
        <Link
            href={tvHref}
            target="_blank"
            className="btn btn-primary"
            style={{ ...fullBtn, padding: '8px 14px', fontSize: '0.85rem' }}
        >
            <Tv size={15} />
            TV
        </Link>
    ) : null;

    if (isActive) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                {/* Row 1: Kamera (only for starter) + Beenden (only for stopper) */}
                {(canStop) && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={openBroadcastWindow}
                            className="btn btn-secondary"
                            style={fullBtn}
                        >
                            <ExternalLink size={15} />
                            Kamera
                        </button>
                        <button
                            onClick={handleStop}
                            disabled={isPending}
                            className="btn btn-secondary"
                            style={{ ...fullBtn, color: 'var(--color-error)' }}
                        >
                            {isPending ? <Loader2 size={15} className="animate-spin" /> : <VideoOff size={15} />}
                            Beenden
                        </button>
                    </div>
                )}
                {/* Row 2: TV full width */}
                {tvButton}
                {error && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>{error}</span>}
            </div>
        );
    }

    if (!canStart) {
        // Can't start and not active: only TV button
        return tvButton;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {/* Row 1: Stream starten full width */}
            <button
                onClick={handleStart}
                disabled={isPending}
                className="btn btn-secondary"
                style={fullBtn}
            >
                {isPending ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
                Stream starten
            </button>
            {/* Row 2: TV full width */}
            {tvButton}
            {error && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>{error}</span>}
        </div>
    );
}
