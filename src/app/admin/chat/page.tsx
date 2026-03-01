import { prisma } from '@/lib/prisma';
import { MessageSquare } from 'lucide-react';
import ChatDeleteButton from './delete-button';

export const dynamic = 'force-dynamic';

function formatTime(date: Date) {
    return new Date(date).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default async function AdminChatPage() {
    const messages = await prisma.chatMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
            user: { select: { id: true, name: true } },
        },
    });

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
            <header style={{ marginBottom: 'var(--spacing-2)' }}>
                <h1 className="title-display" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>Chat</h1>
                <p style={{ color: 'var(--color-text-dim)' }}>{messages.length} Nachrichten (neueste zuerst)</p>
            </header>

            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {messages.length === 0 && (
                    <p style={{ padding: 'var(--spacing-6)', color: 'var(--color-text-dim)', textAlign: 'center' }}>
                        Keine Nachrichten vorhanden.
                    </p>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={msg.id}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--spacing-3)',
                            padding: 'var(--spacing-3) var(--spacing-4)',
                            borderBottom: i < messages.length - 1 ? '1px solid var(--color-border)' : 'none',
                        }}
                    >
                        {/* Avatar initial */}
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: '#fff',
                            flexShrink: 0,
                        }}>
                            {(msg.user.name ?? '?')[0].toUpperCase()}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-2)', marginBottom: '2px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{msg.user.name ?? 'Unbekannt'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{formatTime(msg.createdAt)}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text)', wordBreak: 'break-word', lineHeight: 1.4 }}>
                                {msg.text}
                            </p>
                        </div>

                        {/* Delete */}
                        <ChatDeleteButton messageId={msg.id} />
                    </div>
                ))}
            </div>
        </div>
    );
}
