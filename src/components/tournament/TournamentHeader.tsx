'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { MapPin, Calendar, Users, User, Trophy, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import TournamentQRCode from '@/components/TournamentQRCode';
import { getTournamentTypeLabel } from '@/lib/tournament-utils';
import { useTranslations } from 'next-intl';

interface Props {
    tournament: {
        id: string;
        name: string;
        date: Date;
        location: string;
        status: string;
        mode: string;
        isRanked: boolean;
        type: string;
        shortCode: string | null;
        hasReturnLeg: boolean;
    };
    participantCount: number;
    isHost: boolean;
    showQR?: boolean;
}

export default function TournamentHeader({
    tournament,
    participantCount,
    isHost,
    showQR = false
}: Props) {
    const t = useTranslations('tournaments');
    const [copied, setCopied] = useState(false);
    const isPlanned = tournament.status === 'PLANNED';
    const isActive = tournament.status === 'ACTIVE';
    const isCompleted = tournament.status === 'COMPLETED';

    const copyLink = async () => {
        const url = tournament.shortCode
            ? `${window.location.origin}/join/${tournament.shortCode}`
            : window.location.href;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const statusConfig = {
        PLANNED: { label: t('statusLobby'), color: 'var(--color-info)', bg: 'var(--color-info-light)' },
        ACTIVE: { label: t('statusLive'), color: 'var(--color-success)', bg: 'var(--color-success-light)' },
        COMPLETED: { label: t('statusEnded'), color: 'var(--color-text-dim)', bg: 'var(--color-surface-secondary)' }
    };

    const status = statusConfig[tournament.status as keyof typeof statusConfig] || statusConfig.PLANNED;

    return (
        <header className="tournament-header">
            {/* Status Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--spacing-3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)', minWidth: 0 }}>
                    {/* Status Badge */}
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        background: status.bg,
                        border: `1px solid ${status.color}`,
                        borderRadius: "6px",
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: status.color,
                        textTransform: 'uppercase',
                        letterSpacing: "0"
                    }}>
                        {isActive && (
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: status.color,
                                animation: 'pulse 2s infinite'
                            }} />
                        )}
                        {status.label}
                    </span>

                    {/* Mode Badge */}
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        background: tournament.mode === 'TEAM'
                            ? "rgba(40,100,122,0.15)"
                            : 'rgba(255, 107, 107, 0.15)',
                        border: `1px solid ${tournament.mode === 'TEAM' ? 'var(--color-secondary)' : 'var(--color-primary)'}`,
                        borderRadius: "6px",
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: tournament.mode === 'TEAM' ? 'var(--color-secondary)' : 'var(--color-primary)'
                    }}>
                        {tournament.mode === 'TEAM' ? <Users size={12} /> : <User size={12} />}
                        {tournament.mode === 'TEAM' ? '2v2' : '1v1'}
                    </span>

                    {/* Ranked Badge */}
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        background: tournament.isRanked ? 'rgba(217, 119, 6, 0.1)' : "rgba(0,107,80,0.15)",
                        border: `1px solid ${tournament.isRanked ? 'rgba(217, 119, 6, 0.3)' : "rgba(0,107,80,0.5)"}`,
                        borderRadius: "6px",
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: tournament.isRanked ? "#94600b" : "#006b50"
                    }}>
                        {tournament.isRanked ? <Trophy size={12} /> : <Sparkles size={12} />}
                        {tournament.isRanked ? t('rankedShort') : t('funShort')}
                    </span>

                    {/* Type Badge */}
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        background: "rgba(40,100,122,0.1)",
                        border: "1px solid rgba(40,100,122,0.3)",
                        borderRadius: "6px",
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: "#28647a",
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}>
                        {getTournamentTypeLabel(tournament.type)}
                    </span>

                    {/* Return Leg Badge */}
                    {tournament.hasReturnLeg && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: "6px",
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: "#08754b"
                        }}>
                            {t('returnLegBadge')}
                        </span>
                    )}
                </div>


            </div>

            {/* Title */}
            <h1 style={{
                fontSize: "2rem",
                fontWeight: 700,
                marginBottom: 'var(--spacing-3)',
                lineHeight: 1.2
            }}>
                {tournament.name}
            </h1>

            {/* Meta Info */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--spacing-4)',
                fontSize: '0.9rem',
                color: 'var(--color-text-dim)'
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} style={{ opacity: 0.7 }} />
                    {format(new Date(tournament.date), "EEEE, dd. MMMM 'um' HH:mm 'Uhr'", { locale: de })}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} style={{ opacity: 0.7 }} />
                    {tournament.location}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} style={{ opacity: 0.7 }} />
                    {participantCount} {tournament.mode === 'TEAM' ? 'Teams' : t('playerLabel')}
                </span>
            </div>

            {/* Join Code & QR (for PLANNED) */}
            {isPlanned && tournament.shortCode && (
                <div style={{
                    marginTop: 'var(--spacing-4)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--spacing-3)',
                    width: '100%'
                }}>
                    <div className="btn" style={{
                        padding: '6px 10px',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        cursor: 'default'
                    }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>Code:</span>
                        <span style={{
                            fontFamily: 'monospace',
                            fontSize: '1rem',
                            fontWeight: 700,
                            letterSpacing: "0",
                            color: 'var(--color-primary)'
                        }}>
                            {tournament.shortCode}
                        </span>
                        <button
                            onClick={copyLink}
                            className="icon-button"
                            aria-label={t('copyLink')}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '0',
                                cursor: 'pointer',
                                color: 'var(--color-text-dim)',
                                display: 'flex',
                                marginLeft: '4px'
                            }}
                            title={t('copyLink')}
                        >
                            {copied ? <Check size={16} color="#27ae60" /> : <Copy size={16} />}
                        </button>
                    </div>

                    {/* QR Code Button */}
                    {showQR && (
                        <TournamentQRCode
                            tournamentId={tournament.id}
                            tournamentName={tournament.name}
                            shortCode={tournament.shortCode}
                        />
                    )}
                </div>
            )}

            {/* Inline CSS for pulse animation */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </header>
    );
}
