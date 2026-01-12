'use client';

import { useState, useEffect } from 'react';
import { updateNotificationPreferences, getNotificationPreferences } from '@/app/actions/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X } from 'lucide-react';

const Toggle = ({ active, onChange }: { active: boolean, onChange: (v: boolean) => void }) => (
    <button
        type="button"
        onClick={() => onChange(!active)}
        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${active ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-glow-primary' : 'bg-gray-700'}`}
    >
        <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${active ? 'translate-x-5' : ''}`}
        />
    </button>
);

export default function NotificationSettingsDialog({ onClose }: { onClose: () => void }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [prefs, setPrefs] = useState({
        notifyNewTournaments: true,
        notifyUpdates: true,
        notifyLiveTicker: true
    });

    useEffect(() => {
        getNotificationPreferences().then(data => {
            if (data) {
                setPrefs({
                    notifyNewTournaments: data.notifyNewTournaments ?? true,
                    notifyUpdates: data.notifyUpdates ?? true,
                    notifyLiveTicker: data.notifyLiveTicker ?? true
                });
            }
            setLoading(false);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const formData = new FormData();
        if (prefs.notifyNewTournaments) formData.append('notifyNewTournaments', 'on');
        if (prefs.notifyUpdates) formData.append('notifyUpdates', 'on');
        if (prefs.notifyLiveTicker) formData.append('notifyLiveTicker', 'on');

        await updateNotificationPreferences(formData);
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="glass-panel w-full max-w-md p-0 relative overflow-hidden"
                style={{ background: 'rgba(15, 23, 42, 0.85)' }}
            >
                {/* Header with decorative top border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>

                <div className="p-6">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                        <Settings size={20} className="text-purple-400" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Einstellungen
                        </span>
                    </h2>

                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>Laden...</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-3">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 pr-4">
                                            <div className="font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">🏆 Neue Turniere</div>
                                            <div className="text-xs text-gray-400 leading-relaxed">Erfahre sofort, wenn ein neues Turnier geplant wird.</div>
                                        </div>
                                        <Toggle
                                            active={prefs.notifyNewTournaments}
                                            onChange={(v) => setPrefs({ ...prefs, notifyNewTournaments: v })}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 pr-4">
                                            <div className="font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">📢 Updates</div>
                                            <div className="text-xs text-gray-400 leading-relaxed">Wichtige Infos zu deinen Turnieren.</div>
                                        </div>
                                        <Toggle
                                            active={prefs.notifyUpdates}
                                            onChange={(v) => setPrefs({ ...prefs, notifyUpdates: v })}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 pr-4">
                                            <div className="font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">🎙️ Live Ticker</div>
                                            <div className="text-xs text-gray-400 leading-relaxed">Match-Updates & KI-Kommentare als Push.</div>
                                        </div>
                                        <Toggle
                                            active={prefs.notifyLiveTicker}
                                            onChange={(v) => setPrefs({ ...prefs, notifyLiveTicker: v })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end gap-3 border-t border-white/10 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition text-sm font-medium"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/20 transition-all transform hover:scale-105 active:scale-95 text-sm font-bold disabled:opacity-50 disabled:transform-none select-none"
                                >
                                    {saving ? 'Speichert...' : 'Speichern'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
