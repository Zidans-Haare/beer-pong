'use client';

import { useState } from 'react';
import { sendManualBroadcast } from '@/app/actions/notifications';
import { Send, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BroadcastPage() {
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (formData: FormData) => {
        setStatus('sending');
        const res = await sendManualBroadcast(formData);

        if (res.success) {
            setStatus('success');
            const count = 'count' in res ? res.count : 0;
            setMessage(`Nachricht gesendet! (${count} Empfänger)`);
        } else {
            setStatus('error');
            setMessage(res.error || 'Fehler beim Senden');
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            Broadcast Senden
                        </h1>
                        <p className="text-gray-400">Nachricht an alle Nutzer senden</p>
                    </div>
                </div>

                <form action={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Titel</label>
                        <input
                            name="title"
                            required
                            placeholder="z.B. Neue Features!"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Nachricht</label>
                        <textarea
                            name="message"
                            required
                            rows={4}
                            placeholder="Deine Nachricht hier..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Typ</label>
                        <select
                            name="type"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                        >
                            <option value="UPDATE">📢 Update (Allgemein)</option>
                            <option value="TOURNAMENT">🏆 Turnier Info</option>
                            <option value="SYSTEM">⚠️ System</option>
                            <option value="GENERIC">📝 Sonstiges</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Nur Nutzer, die diesen Benachrichtigungstyp aktiviert haben, erhalten die Nachricht.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'sending'}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                        {status === 'sending' ? 'Sende...' : (
                            <>
                                <Send size={18} />
                                Broadcast Senden
                            </>
                        )}
                    </button>

                    {status === 'success' && (
                        <div className="p-4 bg-green-500/20 text-green-400 rounded-lg text-center font-medium">
                            ✅ {message}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="p-4 bg-red-500/20 text-red-400 rounded-lg text-center font-medium">
                            ❌ {message}
                        </div>
                    )}
                </form>
            </motion.div>
        </div>
    );
}
