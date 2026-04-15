import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import Link from 'next/link';
import { Tv2, Radio } from 'lucide-react';
import LiveStreamControl from '@/app/tournaments/[id]/LiveStreamControl';

export const dynamic = 'force-dynamic';

const WEBRTC_FLAG = '__webrtc__';

export default async function StreamingPage() {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const isAdmin = session?.user?.email === process.env.ADMIN_EMAIL;

    // Active live streams (include PLANNED too — stream can start before tournament is ACTIVE)
    const liveStreams = await prisma.tournament.findMany({
        where: { liveStreamUrl: { not: null }, status: { in: ['PLANNED', 'ACTIVE'] } },
        select: { id: true, name: true, liveStreamUrl: true, hostId: true },
        orderBy: { date: 'desc' },
    });

    // Tournaments where user is host or participant (and not already live)
    // Admin sees all; others see tournaments where they're host or participant
    const myTournaments = userId ? await prisma.tournament.findMany({
        where: isAdmin
            ? { status: { in: ['PLANNED', 'ACTIVE'] } }
            : {
                status: { in: ['PLANNED', 'ACTIVE'] },
                OR: [
                    { hostId: userId },
                    { participants: { some: { player: { userId } } } },
                ],
            },
        select: {
            id: true,
            name: true,
            status: true,
            liveStreamUrl: true,
            hostId: true,
        },
        orderBy: { date: 'desc' },
    }) : [];

    // Helper: check if userId started this stream
    function didStart(liveStreamUrl: string | null, hostId?: string) {
        if (!userId || !liveStreamUrl) return false;
        if (isAdmin) return true;
        // New format: __webrtc__:<userId>
        if (liveStreamUrl === `__webrtc__:${userId}`) return true;
        // Legacy format: __webrtc__ without userId — fall back to host check
        if (liveStreamUrl === '__webrtc__' && hostId === userId) return true;
        return false;
    }

    // All active/planned tournaments (for TV access without stream)
    const allTournaments = await prisma.tournament.findMany({
        where: { status: { in: ['PLANNED', 'ACTIVE'] } },
        select: { id: true, name: true, status: true, liveStreamUrl: true },
        orderBy: { date: 'desc' },
    });

    // My tournaments not yet streaming
    const myNotLive = myTournaments.filter(t => !t.liveStreamUrl);

    // All non-live tournaments for TV access — exclude those already shown in "Stream starten"
    const liveIds = new Set(liveStreams.map(t => t.id));
    const myNotLiveIds = new Set(myNotLive.map(t => t.id));
    const otherTournaments = allTournaments.filter(t => !liveIds.has(t.id) && !myNotLiveIds.has(t.id));

    const cardStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: 'var(--spacing-4)',
    };

    const topRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: 0,
    };

    const btnRowStyle: React.CSSProperties = {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: 'var(--spacing-6) var(--spacing-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-6)' }}>
                <Tv2 size={28} color="var(--color-primary)" />
                <h1 className="title-gradient" style={{ fontSize: '1.6rem', margin: 0 }}>Streaming</h1>
            </div>

            {/* ── Live jetzt ── */}
            <section style={{ marginBottom: 'var(--spacing-6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-3)' }}>
                    {liveStreams.length > 0 && (
                        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-error)', display: 'inline-block', animation: 'livePulse 1.4s ease-in-out infinite' }} />
                            <span style={{ position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-error)', opacity: 0, animation: 'liveRing 1.4s ease-out infinite' }} />
                        </span>
                    )}
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: liveStreams.length > 0 ? 'var(--color-error)' : 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                        Live jetzt {liveStreams.length > 0 && `(${liveStreams.length})`}
                    </p>
                </div>
                <style>{`
                    @keyframes livePulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(0.85); opacity: 0.7; }
                    }
                    @keyframes liveRing {
                        0% { transform: scale(1); opacity: 0.7; }
                        100% { transform: scale(2.8); opacity: 0; }
                    }
                `}</style>
                {liveStreams.length === 0 ? (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: 'var(--spacing-6)', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                        Kein aktiver Stream gerade.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                        {liveStreams.map(t => {
                            const isMine = myTournaments.some(m => m.id === t.id);
                            const canStart = isMine || isAdmin;
                            const canStop = didStart(t.liveStreamUrl, t.hostId);
                            const isWebRTC = t.liveStreamUrl?.startsWith('__webrtc__') ?? false;
                            return (
                                <div key={t.id} className="glass-panel" style={cardStyle}>
                                    <div style={topRowStyle}>
                                        <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: 'var(--radius-md)', background: 'var(--color-error)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Radio size={20} color="#fff" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--color-error)', fontWeight: 600, marginTop: '2px' }}>
                                                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-error)', display: 'inline-block', animation: 'livePulse 1.4s ease-in-out infinite' }} />
                                                    <span style={{ position: 'absolute', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-error)', opacity: 0, animation: 'liveRing 1.4s ease-out infinite' }} />
                                                </span>
                                                LIVE
                                                <span style={{ color: 'var(--color-text-dim)', fontWeight: 400 }}>· WebRTC</span>
                                            </div>
                                        </div>
                                    </div>
                                    <LiveStreamControl
                                        tournamentId={t.id}
                                        initialUrl={t.liveStreamUrl}
                                        canStart={canStart}
                                        canStop={canStop}
                                        tvHref={`/tournaments/${t.id}/tv`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ── Eigene Turniere (Stream starten) ── */}
            {userId && myNotLive.length > 0 && (
                <section style={{ marginBottom: 'var(--spacing-6)' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--spacing-3)' }}>
                        Stream starten
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                        {myNotLive.map(t => (
                            <div key={t.id} className="glass-panel" style={cardStyle}>
                                <div style={topRowStyle}>
                                    <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Tv2 size={20} color="var(--color-text-dim)" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                                            {t.status === 'ACTIVE' ? 'Aktiv' : 'Geplant'}
                                        </div>
                                    </div>
                                </div>
                                <LiveStreamControl
                                    tournamentId={t.id}
                                    initialUrl={t.liveStreamUrl}
                                    canStart={true}
                                    canStop={didStart(t.liveStreamUrl, t.hostId)}
                                    tvHref={`/tournaments/${t.id}/tv`}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Alle Turniere (TV ohne Stream) ── */}
            {otherTournaments.length > 0 && (
                <section style={{ marginBottom: 'var(--spacing-6)' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--spacing-3)' }}>
                        TV-Ansicht
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                        {otherTournaments.map(t => (
                            <div key={t.id} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'var(--spacing-4)' }}>
                                <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Tv2 size={20} color="var(--color-text-dim)" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                                        {t.status === 'ACTIVE' ? 'Aktiv' : 'Geplant'}
                                    </div>
                                </div>
                                <Link href={`/tournaments/${t.id}/tv`} target="_blank" className={t.liveStreamUrl ? 'btn btn-primary' : 'btn btn-secondary'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '7px 14px', flexShrink: 0 }}>
                                    TV {t.liveStreamUrl && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />}
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {!userId && (
                <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.9rem', marginTop: 'var(--spacing-4)' }}>
                    <Link href="/login" style={{ color: 'var(--color-primary)' }}>Einloggen</Link> um eigene Streams zu starten.
                </p>
            )}
        </div>
    );
}
