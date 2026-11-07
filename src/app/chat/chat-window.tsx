'use client';

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { sendChatMessage } from '@/app/actions/chat';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Clock3, LoaderCircle, RotateCw } from 'lucide-react';
import Avatar from '@/components/Avatar';

type ChatUser = { id: string; name: string | null; image: string | null };
type ChatMsg = { id: string; userId: string; text: string; createdAt: string | Date; user: ChatUser };
// Eigene Nachrichten, die noch unterwegs sind oder nicht ankamen
type Item = ChatMsg & { status?: 'pending' | 'failed' };

// Nachrichten derselben Person innerhalb von 5 Minuten bilden eine Gruppe (ein Name, ein Bild, verbundene Blasen)
const GROUP_GAP_MS = 5 * 60_000;
const POLL_MS = 4000;
const OLDER_PAGE = 40;
const MAX_LENGTH = 500;
// Höhe, ab der die Eingabe nicht weiter wächst, sondern scrollt (etwa fünf Zeilen)
const MAX_INPUT_HEIGHT = 132;

const time = (d: string | Date) => new Date(d).getTime();
const sameDay = (a: string | Date, b: string | Date) => new Date(a).toDateString() === new Date(b).toDateString();

// Links in Nachrichten anklickbar machen, alles andere bleibt reiner Text
const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;
function linkify(text: string) {
    return text.split(URL_RE).map((part, i) => (i % 2 === 1
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow">{part}</a>
        : <Fragment key={i}>{part}</Fragment>));
}

export default function ChatWindow({
    initialMessages,
    hasOlder: initialHasOlder,
    currentUserId,
    isLoggedIn,
}: {
    initialMessages: ChatMsg[];
    hasOlder: boolean;
    currentUserId: string | null;
    isLoggedIn: boolean;
}) {
    const t = useTranslations('chat');
    const locale = useLocale();
    const [messages, setMessages] = useState<Item[]>(initialMessages);
    const [input, setInput] = useState('');
    const [online, setOnline] = useState<number | null>(null);
    const [hasOlder, setHasOlder] = useState(initialHasOlder);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [showJump, setShowJump] = useState(false);
    const [unread, setUnread] = useState(0);

    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const stick = useRef(true);
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    // Nachrichten, die nach dem Öffnen dazukamen, gleiten sanft herein
    const fresh = useRef(new Set<string>());
    // beim Nachladen älterer Nachrichten: Abstand zum unteren Ende halten, damit nichts springt
    const keepFromBottom = useRef<number | null>(null);
    // Warteschlange eigener Nachrichten (Kennung und Text), wird der Reihe nach verschickt
    const queue = useRef<{ id: string; text: string }[]>([]);
    const sending = useRef(false);

    const timeFmt = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }), [locale]);
    const dayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }), [locale]);
    const dayLabel = (d: string | Date) => {
        const date = new Date(d);
        const today = new Date();
        const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return t('today');
        if (date.toDateString() === yesterday.toDateString()) return t('yesterday');
        return dayFmt.format(date);
    };

    const toBottom = useCallback((smooth = false) => {
        const list = listRef.current;
        if (!list) return;
        list.scrollTo({ top: list.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    // Beim Öffnen ohne sichtbaren Sprung ganz unten starten
    useLayoutEffect(() => { toBottom(); }, [toBottom]);

    // Nach jeder Änderung: unten bleiben, wenn man unten war; beim Nachladen oben die Position halten
    useLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return;
        if (keepFromBottom.current !== null) {
            list.scrollTop = list.scrollHeight - keepFromBottom.current;
            keepFromBottom.current = null;
            return;
        }
        if (stick.current) toBottom(true);
    }, [messages, toBottom]);

    // Tastatur fährt aus oder ein: wer unten war, bleibt unten
    useEffect(() => {
        const onViewport = () => { if (stick.current) toBottom(); };
        window.addEventListener('chat-viewport', onViewport);
        return () => window.removeEventListener('chat-viewport', onViewport);
    }, [toBottom]);

    // Neue Nachrichten holen: regelmäßig und sofort, wenn die App wieder sichtbar wird
    const poll = useCallback(async () => {
        const saved = messagesRef.current.filter(m => !m.status && !m.id.startsWith('local-'));
        const since = saved.length ? new Date(saved[saved.length - 1].createdAt).toISOString() : new Date(0).toISOString();
        try {
            const res = await fetch(`/api/chat?since=${encodeURIComponent(since)}`, { cache: 'no-store' });
            if (!res.ok) return;
            const incoming: ChatMsg[] = await res.json();
            if (!incoming.length) return;
            setMessages(prev => {
                let next = prev;
                for (const msg of incoming) {
                    if (next.some(m => m.id === msg.id)) continue;
                    // eigene Nachricht, die schon als „unterwegs“ angezeigt wird: ersetzen statt doppelt zeigen
                    const local = next.find(m => m.status === 'pending' && m.userId === msg.userId && m.text === msg.text);
                    if (local) { next = next.map(m => (m === local ? msg : m)); queue.current = queue.current.filter(q => q.id !== local.id); continue; }
                    fresh.current.add(msg.id);
                    next = [...next, msg];
                }
                return next;
            });
            if (!stick.current) setUnread(n => n + incoming.filter(m => m.userId !== currentUserId).length);
        } catch { /* nächster Versuch beim nächsten Takt */ }
    }, [currentUserId]);

    useEffect(() => {
        const interval = setInterval(() => { if (document.visibilityState === 'visible') void poll(); }, POLL_MS);
        const onVisible = () => { if (document.visibilityState === 'visible') void poll(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
    }, [poll]);

    // Wer gerade online ist, steht unter dem Titel
    useEffect(() => {
        let alive = true;
        const load = () => fetch('/api/presence', { cache: 'no-store' }).then(r => r.json()).then((d: { count: number }) => { if (alive) setOnline(d.count); }).catch(() => undefined);
        void load();
        const interval = setInterval(load, 30_000);
        return () => { alive = false; clearInterval(interval); };
    }, []);

    async function loadOlder() {
        const first = messagesRef.current.find(m => !m.status && !m.id.startsWith('local-'));
        if (!first || loadingOlder || !hasOlder) return;
        setLoadingOlder(true);
        try {
            const res = await fetch(`/api/chat?before=${encodeURIComponent(new Date(first.createdAt).toISOString())}&limit=${OLDER_PAGE}`, { cache: 'no-store' });
            const older: ChatMsg[] = res.ok ? await res.json() : [];
            if (older.length < OLDER_PAGE) setHasOlder(false);
            if (older.length) {
                const list = listRef.current;
                if (list) keepFromBottom.current = list.scrollHeight - list.scrollTop;
                setMessages(prev => [...older.filter(o => !prev.some(m => m.id === o.id)), ...prev]);
            }
        } finally {
            setLoadingOlder(false);
        }
    }

    function onScroll() {
        const list = listRef.current;
        if (!list) return;
        const fromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
        stick.current = fromBottom < 80;
        setShowJump(fromBottom > 400);
        if (stick.current) setUnread(0);
        if (list.scrollTop < 200) void loadOlder();
    }

    // Eigene Nachrichten nacheinander abschicken, damit die Reihenfolge stimmt
    async function pump() {
        if (sending.current) return;
        sending.current = true;
        while (queue.current.length) {
            const { id, text } = queue.current[0];
            let saved: ChatMsg | null = null;
            try {
                const res = await sendChatMessage(text);
                if (res.success && res.message) saved = res.message as ChatMsg;
            } catch { /* gilt als nicht gesendet */ }
            queue.current.shift();
            setMessages(prev => (saved
                ? prev.filter(m => m.id !== saved!.id).map(m => (m.id === id ? { ...saved!, createdAt: saved!.createdAt } : m))
                : prev.map(m => (m.id === id ? { ...m, status: 'failed' as const } : m))));
        }
        sending.current = false;
    }

    function send() {
        const text = input.trim();
        if (!text || !isLoggedIn) return;
        const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        fresh.current.add(id);
        stick.current = true;
        setMessages(prev => [...prev, { id, userId: currentUserId ?? '', text, createdAt: new Date().toISOString(), user: { id: currentUserId ?? '', name: t('me'), image: null }, status: 'pending' }]);
        setInput('');
        queue.current.push({ id, text });
        void pump();
        // Tastatur bleibt offen, wie in jedem Messenger
        inputRef.current?.focus();
    }

    function retry(id: string) {
        const failed = messagesRef.current.find(m => m.id === id);
        if (!failed) return;
        setMessages(prev => prev.map(m => (m.id === id ? { ...m, status: 'pending', createdAt: new Date().toISOString() } : m)));
        queue.current.push({ id, text: failed.text });
        void pump();
    }

    // Eingabe wächst mit dem Text bis etwa fünf Zeilen; gemessen wird nach dem Rendern, wenn der Text drin steht
    useLayoutEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(MAX_INPUT_HEIGHT, el.scrollHeight)}px`;
        el.style.overflowY = el.scrollHeight > MAX_INPUT_HEIGHT ? 'auto' : 'hidden';
    }, [input]);

    return (
        <div className="chat-window">
            <header className="chat-header">
                <Link href="/" className="chat-back" aria-label={t('back')}><ArrowLeft size={22} /></Link>
                <div className="chat-title">
                    <h1>{t('title')}</h1>
                    <span>{online !== null ? t('online', { count: online }) : ' '}</span>
                </div>
            </header>

            <div className="chat-messages" ref={listRef} onScroll={onScroll} role="log" aria-live="polite" aria-label={t('title')}>
                <div className="chat-thread">
                    {loadingOlder && <div className="chat-older"><LoaderCircle size={18} className="loading-spin" aria-label={t('loadingOlder')} /></div>}
                    {messages.length === 0 && <p className="chat-empty">{t('noMessages')}</p>}
                    {messages.map((msg, i) => {
                        const prev = messages[i - 1], next = messages[i + 1];
                        const newDay = !prev || !sameDay(prev.createdAt, msg.createdAt);
                        const first = newDay || prev.userId !== msg.userId || time(msg.createdAt) - time(prev.createdAt) > GROUP_GAP_MS;
                        const last = !next || !sameDay(next.createdAt, msg.createdAt) || next.userId !== msg.userId || time(next.createdAt) - time(msg.createdAt) > GROUP_GAP_MS;
                        const mine = msg.userId === currentUserId;
                        return (
                            <Fragment key={msg.id}>
                                {newDay && <div className="chat-day"><span>{dayLabel(msg.createdAt)}</span></div>}
                                <div className={`chat-row${mine ? ' is-mine' : ''}${first ? ' is-first' : ''}${last ? ' is-last' : ''}${fresh.current.has(msg.id) ? ' is-new' : ''}`}>
                                    {!mine && <div className="chat-avatar">{last && <Avatar name={msg.user.name ?? '?'} src={msg.user.image} size={30} />}</div>}
                                    <div className="chat-stack">
                                        {!mine && first && <span className="chat-name">{msg.user.name ?? t('unknown')}</span>}
                                        <div
                                            className="chat-bubble"
                                            data-pending={msg.status === 'pending' ? 'true' : 'false'}
                                            data-failed={msg.status === 'failed' ? 'true' : undefined}
                                        >
                                            <span className="chat-text">{linkify(msg.text)}</span>
                                            <span className="chat-meta" aria-hidden="true">
                                                {timeFmt.format(new Date(msg.createdAt))}
                                                {mine && (msg.status === 'pending' ? <Clock3 size={12} /> : msg.status === 'failed' ? null : <Check size={13} />)}
                                            </span>
                                        </div>
                                        {msg.status === 'failed' && (
                                            <button type="button" className="chat-retry" onClick={() => retry(msg.id)}>
                                                <RotateCw size={13} aria-hidden="true" /> {t('failed')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Fragment>
                        );
                    })}
                </div>
            </div>

            {showJump && (
                <button type="button" className="chat-jump" aria-label={t('newMessages')} onClick={() => { stick.current = true; setUnread(0); toBottom(true); }}>
                    <ArrowDown size={20} />
                    {unread > 0 && <span className="chat-jump-badge">{unread}</span>}
                </button>
            )}

            <div className="chat-composer">
                {isLoggedIn ? (
                    <form className="chat-input" onSubmit={event => { event.preventDefault(); send(); }}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            rows={1}
                            maxLength={MAX_LENGTH}
                            enterKeyHint="send"
                            placeholder={t('placeholder')}
                            aria-label={t('placeholder')}
                            onChange={event => setInput(event.target.value)}
                            onKeyDown={event => {
                                // Enter schickt ab, Umschalt+Enter macht eine neue Zeile; nicht während einer Wortauswahl (IME)
                                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); }
                            }}
                            onFocus={() => { if (stick.current) setTimeout(() => toBottom(), 250); }}
                        />
                        <button
                            type="submit"
                            className="chat-send"
                            aria-label={t('send')}
                            disabled={!input.trim()}
                            // Antippen nimmt dem Feld nicht den Fokus, sonst klappt die Tastatur zu
                            onPointerDown={event => event.preventDefault()}
                        >
                            <ArrowUp size={20} strokeWidth={2.6} />
                        </button>
                    </form>
                ) : (
                    <p className="chat-login"><Link href="/login?callbackUrl=%2Fchat">{t('login')}</Link>{t('loginToChat')}</p>
                )}
            </div>
        </div>
    );
}
