'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { sendChatMessage } from '@/app/actions/chat';

type ChatUser = { id: string; name: string | null; image: string | null };
type ChatMsg = { id: string; userId: string; text: string; createdAt: string | Date; user: ChatUser };

function AvatarInitial({ name }: { name: string | null }) {
    const letter = (name ?? '?')[0].toUpperCase();
    return (
        <div style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.65rem', color: '#fff', flexShrink: 0,
        }}>
            {letter}
        </div>
    );
}

export default function TvChat() {
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [isPending, startTransition] = useTransition();
    const bottomRef = useRef<HTMLDivElement>(null);
    const lastTimestampRef = useRef<string>(new Date(0).toISOString());

    // Initial load + polling
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/chat?limit=30');
                if (!res.ok) return;
                const msgs: ChatMsg[] = await res.json();
                setMessages(msgs);
                if (msgs.length > 0) {
                    lastTimestampRef.current = new Date(msgs[msgs.length - 1].createdAt).toISOString();
                }
            } catch {}
        }
        load();

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/chat?since=${encodeURIComponent(lastTimestampRef.current)}`);
                if (!res.ok) return;
                const newMsgs: ChatMsg[] = await res.json();
                if (newMsgs.length > 0) {
                    setMessages(prev => [...prev, ...newMsgs].slice(-60));
                    lastTimestampRef.current = new Date(newMsgs[newMsgs.length - 1].createdAt).toISOString();
                }
            } catch {}
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    function handleSend() {
        const text = input.trim();
        if (!text || isPending) return;
        const optimistic: ChatMsg = {
            id: `opt-${Date.now()}`,
            userId: '__me__',
            text,
            createdAt: new Date().toISOString(),
            user: { id: '__me__', name: 'Du', image: null },
        };
        setMessages(prev => [...prev, optimistic]);
        setInput('');
        startTransition(async () => {
            const res = await sendChatMessage(text);
            if (res.success && res.message) {
                setMessages(prev => prev.map(m => m.id === optimistic.id ? (res.message as ChatMsg) : m));
                lastTimestampRef.current = new Date((res.message as ChatMsg).createdAt).toISOString();
            } else {
                setMessages(prev => prev.filter(m => m.id !== optimistic.id));
                setInput(text);
            }
        });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                {messages.length === 0 && (
                    <p style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem', textAlign: 'center', marginTop: '16px' }}>
                        Noch keine Nachrichten.
                    </p>
                )}
                {messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', opacity: msg.id.startsWith('opt-') ? 0.6 : 1 }}>
                        <AvatarInitial name={msg.user.name} />
                        <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)', marginRight: '4px' }}>
                                {msg.user.name ?? '?'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text)', wordBreak: 'break-word' }}>
                                {msg.text}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', flexShrink: 0 }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                    placeholder="Nachricht…"
                    maxLength={200}
                    disabled={isPending}
                    style={{
                        flex: 1,
                        padding: '6px 10px',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-full)',
                        color: 'var(--color-text)',
                        fontSize: '0.75rem',
                        minWidth: 0,
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={isPending || !input.trim()}
                    style={{
                        padding: '6px 10px',
                        background: 'var(--color-primary)',
                        color: '#000',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                        opacity: (isPending || !input.trim()) ? 0.5 : 1,
                    }}
                >
                    Senden
                </button>
            </div>
        </div>
    );
}
