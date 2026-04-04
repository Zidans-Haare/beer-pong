'use client';

import { useEffect, useState, useRef } from 'react';
import { getTickerEvents } from '@/app/actions/ticker';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TickerEvent {
    id: string;
    type: string;
    content: string;
    createdAt: Date;
}

export function LiveTicker({ tournamentId }: { tournamentId: string }) {
    const [events, setEvents] = useState<TickerEvent[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const t = useTranslations('liveTicker');

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 5000);
        return () => clearInterval(interval);
    }, [tournamentId]);

    const fetchEvents = async () => {
        const result = await getTickerEvents(tournamentId);
        if (result.success && result.events) {
            // Check if we have new events to scroll to top? 
            // Usually feeds are newest top, or stick to bottom. 
            // Let's keep newest at top for now as per previous implementation.
            setEvents(result.events);
        }
    };



    const getGradientStyle = (type: string) => {
        switch (type) {
            case 'COMMENTARY':
                return {
                    background: 'linear-gradient(135deg, rgba(217, 70, 239, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
                    borderLeft: '3px solid var(--color-primary)'
                };
            case 'SCORE_UPDATE':
                return {
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                    borderLeft: '3px solid var(--color-secondary)'
                };
            case 'MATCH_END':
                return {
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                    borderLeft: '3px solid var(--color-success)'
                };
            default:
                return {
                    background: 'var(--color-surface-hover)',
                    borderLeft: '3px solid var(--color-border)'
                };
        }
    };

    return (
        <div className="glass-panel" style={{
            marginTop: 'var(--spacing-6)',
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)'
        }}>
            {/* Header */}
            <div
                style={{
                    padding: 'var(--spacing-4)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: 'var(--color-surface)',
                    borderBottom: !isCollapsed ? '1px solid var(--color-border)' : 'none'
                }}
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <div style={{ position: 'relative', display: 'flex' }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            boxShadow: '0 0 8px #ef4444'
                        }} />
                        <div style={{
                            position: 'absolute',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            opacity: 0.5,
                            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                        }} />
                    </div>
                    <h3 className="title-display" style={{ fontSize: '1.1rem', margin: 0 }}>
                        Live Feed
                    </h3>
                </div>

                <button style={{ color: 'var(--color-text-dim)' }}>
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
            </div>

            {/* Content */}
            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div
                            ref={scrollRef}
                            style={{
                                maxHeight: '350px',
                                overflowY: 'auto',
                                padding: 'var(--spacing-4)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--spacing-3)',
                                background: 'rgba(250, 250, 250, 0.5)'
                            }}
                            className="custom-scrollbar"
                        >
                            <AnimatePresence initial={false} mode='popLayout'>
                                {events.map((event) => (
                                    <motion.div
                                        key={event.id}
                                        layout
                                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '0.9rem',
                                            color: 'var(--color-text)',
                                            boxShadow: 'var(--shadow-sm)',
                                            ...getGradientStyle(event.type)
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '6px',
                                            opacity: 0.8
                                        }}>
                                            <span style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {event.type === 'COMMENTARY' ? t('commentary') :
                                                    event.type === 'SCORE_UPDATE' ? t('scoreUpdate') :
                                                        event.type === 'MATCH_END' ? t('matchEnd') : t('info')}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                {new Date(event.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div style={{ lineHeight: 1.5 }}>
                                            {event.content}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {events.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: 'var(--spacing-8)',
                                    color: 'var(--color-text-dim)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2)'
                                }}>
                                    <Sparkles size={24} style={{ opacity: 0.3 }} />
                                    <p>{t('noEvents')}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes ping {
                    75%, 100% {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}
