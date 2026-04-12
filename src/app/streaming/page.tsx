import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Tv2, Radio } from 'lucide-react';

export const dynamic = 'force-dynamic';

const WEBRTC_FLAG = '__webrtc__';

export default async function StreamingPage() {
    const liveStreams = await prisma.tournament.findMany({
        where: {
            liveStreamUrl: { not: null },
            status: 'ACTIVE',
        },
        select: { id: true, name: true, date: true, liveStreamUrl: true },
        orderBy: { date: 'desc' },
    });

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: 'var(--spacing-6) var(--spacing-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-6)' }}>
                <Tv2 size={28} color="var(--color-primary)" />
                <h1 className="title-gradient" style={{ fontSize: '1.6rem', margin: 0 }}>Streaming</h1>
            </div>

            {liveStreams.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                    <Tv2 size={40} color="var(--color-text-dim)" style={{ marginBottom: '12px', opacity: 0.4 }} />
                    <p style={{ color: 'var(--color-text-dim)', margin: 0 }}>
                        Gerade kein aktiver Stream. Sobald ein Turnier live geht, erscheint es hier.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                    {liveStreams.map(t => (
                        <Link
                            key={t.id}
                            href={`/tournaments/${t.id}/tv`}
                            style={{ textDecoration: 'none' }}
                        >
                            <div className="glass-panel" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: 'var(--spacing-4)',
                                cursor: 'pointer',
                                transition: 'border-color 0.15s',
                            }}>
                                <div style={{
                                    width: '44px', height: '44px', flexShrink: 0,
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-error)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Radio size={22} color="#fff" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '2px' }}>{t.name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-error)', fontWeight: 600 }}>
                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-error)', display: 'inline-block', boxShadow: '0 0 6px var(--color-error)' }} />
                                        LIVE
                                        {t.liveStreamUrl === WEBRTC_FLAG && <span style={{ color: 'var(--color-text-dim)', fontWeight: 400 }}>· WebRTC</span>}
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '0.8rem', color: 'var(--color-primary)',
                                    fontWeight: 600, whiteSpace: 'nowrap',
                                }}>
                                    Ansehen →
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
