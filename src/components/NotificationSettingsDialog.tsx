'use client';

import { useState, useEffect } from 'react';
import { updateNotificationPreferences, getNotificationPreferences } from '@/app/actions/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Trophy, AlertCircle, Radio } from 'lucide-react';

const Toggle = ({ active, onChange }: { active: boolean, onChange: (v: boolean) => void }) => (
    <button
        type="button"
        onClick={() => onChange(!active)}
        className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${active ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-white/10'}`}
    >
        <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${active ? 'translate-x-6' : ''}`}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel w-full max-w-md p-0 relative overflow-hidden"
                style={{
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="p-8 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 p-2 text-white/30 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="p-3 bg-white/5 rounded-2xl mb-3 border border-white/5 shadow-inner">
                            <Settings size={28} className="text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                            Einstellungen
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">Verwalte deine Benachrichtigungen</p>
                    </div>

                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-3">
                                {/* Tournament Toggle */}
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 rounded-lg text-yellow-500 border border-yellow-500/20">
                                            <Trophy size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-white text-sm mb-0.5">Neue Turniere</div>
                                            <div className="text-xs text-gray-400">Infos zu neuen Events.</div>
                                        </div>
                                        <Toggle
                                            active={prefs.notifyNewTournaments}
                                            onChange={(v) => setPrefs({ ...prefs, notifyNewTournaments: v })}
                                        />
                                    </div>
                                </div>

                                {/* Updates Toggle */}
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                                            <AlertCircle size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-white text-sm mb-0.5">Wichtige Updates</div>
                                            <div className="text-xs text-gray-400">Änderungen & News.</div>
                                        </div>
                                        <Toggle
                                            active={prefs.notifyUpdates}
                                            onChange={(v) => setPrefs({ ...prefs, notifyUpdates: v })}
                                        />
                                    </div>
                                </div>

                                {/* Live Ticker Toggle */}
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-gradient-to-br from-red-500/20 to-pink-500/10 rounded-lg text-red-500 border border-red-500/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]">
                                            <Radio size={20} className="animate-pulse-subtle" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-white text-sm mb-0.5">Live Ticker</div>
                                            <div className="text-xs text-gray-400">Echtzeit Match-Updates.</div>
                                        </div>
                                        <Toggle
                                            active={prefs.notifyLiveTicker}
                                            onChange={(v) => setPrefs({ ...prefs, notifyLiveTicker: v })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition text-sm font-bold border border-white/5"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm font-bold disabled:opacity-50 disabled:transform-none"
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
