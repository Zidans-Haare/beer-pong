'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { sendChatMessage } from '@/app/actions/chat';

type ChatUser = { id: string; name: string | null; image: string | null };
type ChatMsg = { id: string; userId: string; text: string; createdAt: string | Date; user: ChatUser };

function formatTime(date: string | Date) {
    const d = new Date(date);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'gerade eben';
    if (diffMin < 60) return `vor ${diffMin} Min.`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `vor ${diffH} Std.`;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function AvatarInitial({ name }: { name: string | null }) {
    const letter = (name ?? '?')[0].toUpperCase();
    return (
        <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: '#ffffff',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(190,35,213,0.20)',
        }}>
            {letter}
        </div>
    );
}

export default function ChatWindow({
    initialMessages,
    currentUserId,
    isLoggedIn,
}: {
    initialMessages: ChatMsg[];
    currentUserId: string | null;
    isLoggedIn: boolean;
}) {
    const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const bottomRef = useRef<HTMLDivElement>(null);
    const lastTimestampRef = useRef<string>(
        initialMessages.length > 0
            ? new Date(initialMessages[initialMessages.length - 1].createdAt).toISOString()
            : new Date(0).toISOString()
    );

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Poll for new messages every 5 seconds
    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch(`/api/chat?since=${encodeURIComponent(lastTimestampRef.current)}`);
                if (!res.ok) return;
                const newMsgs: ChatMsg[] = await res.json();
                if (newMsgs.length > 0) {
                    setMessages(prev => [...prev, ...newMsgs]);
                    lastTimestampRef.current = new Date(newMsgs[newMsgs.length - 1].createdAt).toISOString();
                }
            } catch {
                // Silently ignore polling errors
            }
        };

        const interval = setInterval(poll, 5000);
        return () => clearInterval(interval);
    }, []);

    function handleSend() {
        const text = input.trim();
        if (!text || isPending) return;

        // Optimistic update
        const optimisticMsg: ChatMsg = {
            id: `optimistic-${Date.now()}`,
            userId: currentUserId ?? '',
            text,
            createdAt: new Date().toISOString(),
            user: { id: currentUserId ?? '', name: 'Du', image: null },
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setInput('');
        setError('');

        startTransition(async () => {
            const res = await sendChatMessage(text);
            if (!res.success) {
                // Remove optimistic message on error
                setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
                setInput(text);
                setError(res.error ?? 'Fehler beim Senden.');
            } else if (res.message) {
                // Replace optimistic with real message
                setMessages(prev =>
                    prev.map(m => m.id === optimisticMsg.id ? (res.message as ChatMsg) : m)
                );
                lastTimestampRef.current = new Date((res.message as ChatMsg).createdAt).toISOString();
            }
        });
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'var(--spacing-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-3)',
            }}>
                {messages.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', marginTop: 'var(--spacing-8)' }}>
                        Noch keine Nachrichten. Sag Hallo!
                    </p>
                )}
                {messages.map(msg => (
                    <div
                        key={msg.id}
                        style={{
                            display: 'flex',
                            gap: 'var(--spacing-3)',
                            alignItems: 'flex-start',
                            flexDirection: msg.userId === currentUserId ? 'row-reverse' : 'row',
                        }}
                    >
                        <AvatarInitial name={msg.user.name} />
                        <div style={{
                            maxWidth: '70%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.userId === currentUserId ? 'flex-end' : 'flex-start',
                            gap: '2px',
                        }}>
                            <div style={{
                                display: 'flex',
                                gap: 'var(--spacing-2)',
                                alignItems: 'baseline',
                                flexDirection: msg.userId === currentUserId ? 'row-reverse' : 'row',
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{msg.user.name ?? 'Unbekannt'}</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>{formatTime(msg.createdAt)}</span>
                            </div>
                            <div style={{
                                background: msg.userId === currentUserId ? 'var(--gradient-primary)' : 'var(--color-surface-2)',
                                color: msg.userId === currentUserId ? '#fff' : 'var(--color-text)',
                                borderRadius: msg.userId === currentUserId ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                padding: '10px 16px',
                                fontSize: '0.9rem',
                                lineHeight: 1.5,
                                wordBreak: 'break-word',
                                opacity: msg.id.startsWith('optimistic-') ? 0.7 : 1,
                                boxShadow: msg.userId === currentUserId ? '0 2px 12px rgba(190,35,213,0.20)' : 'none',
                            }}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--color-border)' }} />

            {/* Input */}
            <div style={{ padding: 'var(--spacing-3) var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                {error && (
                    <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', margin: 0 }}>{error}</p>
                )}
                {isLoggedIn ? (
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Schreib eine Nachricht…"
                            maxLength={500}
                            disabled={isPending}
                            style={{
                                flex: 1,
                                padding: 'var(--spacing-3)',
                                background: 'var(--color-surface-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-full)',
                                color: 'var(--color-text)',
                                fontSize: '0.9rem',
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isPending || !input.trim()}
                            className="btn btn-primary"
                            style={{ flexShrink: 0, opacity: (isPending || !input.trim()) ? 0.5 : 1 }}
                        >
                            Senden
                        </button>
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.9rem', margin: 0 }}>
                        <a href="/login" style={{ color: 'var(--color-primary)' }}>Einloggen</a>, um am Chat teilzunehmen.
                    </p>
                )}
            </div>
        </div>
    );
}
