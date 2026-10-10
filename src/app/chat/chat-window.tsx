'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { sendChatMessage } from '@/app/actions/chat';
import { useTranslations } from 'next-intl';
import { ArrowDown, LoaderCircle, Send } from 'lucide-react';
import Avatar from '@/components/Avatar';

type ChatUser = { id: string; name: string | null; image: string | null };
type ChatMsg = { id: string; userId: string; text: string; createdAt: string | Date; user: ChatUser };

function formatTime(date: string | Date, t: (key: string, params?: Record<string, string | number | Date>) => string) {
    const d = new Date(date);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return t('justNow');
    if (diffMin < 60) return t('minutesAgo', { count: diffMin });
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return t('hoursAgo', { count: diffH });
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
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
    const t = useTranslations('chat');
    const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
    const [input, setInput] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const bottomRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);
    const stickToBottom = useRef(true);
    const [hasNewMessages, setHasNewMessages] = useState(false);
    useEffect(() => { setIsReady(true); }, []);
    const lastTimestampRef = useRef<string>(
        initialMessages.length > 0
            ? new Date(initialMessages[initialMessages.length - 1].createdAt).toISOString()
            : new Date(0).toISOString()
    );

    // Scroll to bottom on new messages
    useEffect(() => {
        if (stickToBottom.current) {
            const area = messagesRef.current;
            if (area) area.scrollTop = area.scrollHeight;
        } else setHasNewMessages(true);
    }, [messages]);

    // Poll for new messages every 5 seconds
    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch(`/api/chat?since=${encodeURIComponent(lastTimestampRef.current)}`);
                if (!res.ok) return;
                const newMsgs: ChatMsg[] = await res.json();
                if (newMsgs.length > 0) {
                    setMessages(prev => [...prev, ...newMsgs.filter(message => !prev.some(existing => existing.id === message.id))]);
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
        if (!text || isPending || !isReady) return;
        stickToBottom.current = true;

        // Optimistic update
        const optimisticMsg: ChatMsg = {
            id: `optimistic-${Date.now()}`,
            userId: currentUserId ?? '',
            text,
            createdAt: new Date().toISOString(),
            user: { id: currentUserId ?? '', name: t('me'), image: null },
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setInput('');
        setError('');

        startTransition(async () => {
            try {
                const res = await sendChatMessage(text);
                if (!res.success) {
                    setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
                    setInput(text);
                    setError(res.error ?? t('sendError'));
                } else if (res.message) {
                    setMessages(prev => prev.filter(message => message.id !== res.message!.id).map(m => m.id === optimisticMsg.id ? (res.message as ChatMsg) : m));
                    lastTimestampRef.current = new Date((res.message as ChatMsg).createdAt).toISOString();
                }
            } catch {
                setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
                setInput(text);
                setError(t('sendError'));
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
        <div className="chat-window">
            {/* Messages */}
            <div className="chat-messages" ref={messagesRef} onScroll={event => {
                const area = event.currentTarget;
                stickToBottom.current = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
                if (stickToBottom.current) setHasNewMessages(false);
            }}>
                {messages.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', marginTop: 'var(--spacing-8)' }}>
                        {t('noMessages')}
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
                        <Avatar name={msg.user.name ?? '?'} src={msg.user.image} size={32} />
                        <div style={{
                            maxWidth: '78%',
                            minWidth: 0,
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
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{msg.user.name ?? t('unknown')}</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>{formatTime(msg.createdAt, t)}</span>
                            </div>
                            <div data-pending={msg.id.startsWith('optimistic-') ? 'true' : 'false'} style={{
                                background: msg.userId === currentUserId ? 'var(--gradient-primary)' : 'var(--color-surface-2)',
                                color: msg.userId === currentUserId ? '#fff' : 'var(--color-text)',
                                borderRadius: msg.userId === currentUserId ? '6px 6px 0 6px' : '6px 6px 6px 0',
                                padding: '10px 16px',
                                fontSize: '0.9rem',
                                lineHeight: 1.5,
                                wordBreak: 'break-word',
                                opacity: msg.id.startsWith('optimistic-') ? 0.7 : 1,
                                boxShadow: 'none',
                            }}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {hasNewMessages && <button type="button" className="btn chat-new-messages" onClick={() => {
                stickToBottom.current = true;
                setHasNewMessages(false);
                const area = messagesRef.current;
                if (area) area.scrollTop = area.scrollHeight;
            }}><ArrowDown size={18} />{t('newMessages')}</button>}
            <div style={{ height: '1px', background: 'var(--color-border)' }} />

            {/* Input */}
            <div className="chat-composer">
                {error && (
                    <p className="form-error" role="alert">{error}</p>
                )}
                {isLoggedIn ? (
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('placeholder')}
                            aria-label={t('placeholder')}
                            maxLength={500}
                            disabled={isPending || !isReady}
                            style={{
                                flex: 1,
                                padding: 'var(--spacing-3)',
                                background: 'var(--color-surface-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '6px',
                                color: 'var(--color-text)',
                                fontSize: '1rem',
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isPending || !isReady || !input.trim()}
                            className="btn btn-primary"
                            aria-label={t('send')}
                            style={{ flexShrink: 0, opacity: (isPending || !input.trim()) ? 0.5 : 1 }}
                        >
                            {isPending ? <LoaderCircle size={20} className="loading-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.9rem', margin: 0 }}>
                        <a href="/login" style={{ color: 'var(--color-primary)' }}>{t('login')}</a>{t('loginToChat')}
                    </p>
                )}
            </div>
        </div>
    );
}
