import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { MapPin, Calendar, Users, User } from 'lucide-react';
import TournamentQRCode from '@/components/TournamentQRCode';
import LobbyPresence from '@/components/LobbyPresence';

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
    const isPlanned = tournament.status === 'PLANNED';
    const isCompleted = tournament.status === 'COMPLETED';

    return (
        <header style={{ marginBottom: 'var(--spacing-6)' }}>
            {/* Title Row */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 'var(--spacing-3)',
                marginBottom: 'var(--spacing-4)'
            }}>
                <div style={{ flex: 1 }}>
                    <h1
                        className="title-gradient"
                        style={{
                            fontSize: 'var(--font-size-2xl)',
                            marginBottom: 'var(--spacing-2)'
                        }}
                    >
                        {tournament.name}
                    </h1>

                    {/* Badges */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--spacing-2)',
                        marginBottom: 'var(--spacing-3)'
                    }}>
                        {/* Mode Badge */}
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-1)',
                            padding: '2px 8px',
                            background: tournament.mode === 'TEAM'
                                ? 'rgba(78, 205, 196, 0.2)'
                                : 'rgba(255, 107, 107, 0.2)',
                            border: `1px solid ${tournament.mode === 'TEAM'
                                ? 'var(--color-secondary)'
                                : 'var(--color-primary)'}`,
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: tournament.mode === 'TEAM'
                                ? 'var(--color-secondary)'
                                : 'var(--color-primary)'
                        }}>
                            {tournament.mode === 'TEAM' ? <Users size={12} /> : <User size={12} />}
                            {tournament.mode === 'TEAM' ? '2v2' : '1v1'}
                        </span>

                        {/* Ranked Badge */}
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-1)',
                            padding: '2px 8px',
                            background: tournament.isRanked
                                ? 'rgba(255, 215, 0, 0.15)'
                                : 'rgba(155, 89, 182, 0.2)',
                            border: `1px solid ${tournament.isRanked ? '#FFD700' : '#9b59b6'}`,
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: tournament.isRanked ? '#FFD700' : '#9b59b6'
                        }}>
                            {tournament.isRanked ? '🏆 Liga' : '🎉 Spaß'}
                        </span>

                        {/* Status Badge */}
                        {isCompleted && (
                            <span style={{
                                padding: '2px 8px',
                                background: 'rgba(39, 174, 96, 0.2)',
                                border: '1px solid #27ae60',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: '#27ae60'
                            }}>
                                ✓ Beendet
                            </span>
                        )}
                    </div>
                </div>

                {/* QR Code & Lobby Presence for planned tournaments */}
                {showQR && isPlanned && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-3)'
                    }}>
                        <TournamentQRCode
                            tournamentId={tournament.id}
                            tournamentName={tournament.name}
                            shortCode={tournament.shortCode || undefined}
                        />
                        <LobbyPresence tournamentId={tournament.id} />
                    </div>
                )}
            </div>

            {/* Info Row */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--spacing-4)',
                fontSize: '0.9rem',
                color: 'var(--color-text-dim)'
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                    <Calendar size={16} />
                    {format(new Date(tournament.date), 'dd.MM.yyyy HH:mm', { locale: de })}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                    <MapPin size={16} />
                    {tournament.location}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                    <Users size={16} />
                    {participantCount} {tournament.mode === 'TEAM' ? 'Teams' : 'Spieler'}
                </span>
            </div>
        </header>
    );
}
