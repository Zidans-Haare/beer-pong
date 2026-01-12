'use client';

import { useEffect, useState } from 'react';
import { getTickerEvents } from '@/app/actions/ticker';
import { motion, AnimatePresence } from 'framer-motion';

interface TickerEvent {
    id: string;
    type: string; // MATCH_START, SCORE_UPDATE, MATCH_END, COMMENTARY
    content: string;
    createdAt: Date;
}

export function LiveTicker({ tournamentId }: { tournamentId: string }) {
    const [events, setEvents] = useState<TickerEvent[]>([]);

    useEffect(() => {
        // Initial fetch
        fetchEvents();

        // Poll every 5 seconds
        const interval = setInterval(fetchEvents, 5000);
        return () => clearInterval(interval);
    }, [tournamentId]);

    const fetchEvents = async () => {
        const result = await getTickerEvents(tournamentId);
        if (result.success && result.events) {
            setEvents(result.events);
        }
    };

    return (
        <div className="glass-card p-4 h-[300px] flex flex-col mt-6">
            <h3 className="text-xl font-bold mb-4 font-outfit bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                Live Ticker & Commentary
            </h3>

            <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {events.map((event) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className={`p-3 rounded-lg text-sm border-l-4 ${event.type === 'COMMENTARY'
                                ? 'bg-purple-900/20 border-purple-500 text-purple-200 italic'
                                : 'bg-white/5 border-blue-500 text-gray-300'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xs uppercase opacity-70">
                                    {event.type === 'COMMENTARY' ? '🎙️ AI Kommentator' :
                                        event.type === 'SCORE_UPDATE' ? '🍺 Becher' :
                                            event.type === 'MATCH_END' ? '🏁 Spielende' : 'Info'}
                                </span>
                                <span className="text-xs opacity-50">
                                    {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p>{event.content}</p>
                        </motion.div>
                    ))}
                    {events.length === 0 && (
                        <div className="text-center text-gray-500 mt-10">
                            Noch keine Ereignisse...
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
