'use client';

import { useState } from 'react';
import { LayoutGrid, Users, Trophy, BarChart3 } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface Tab {
    id: string;
    label: string;
    icon: React.ReactNode;
}

interface Props {
    activeTab: string;
    onTabChange: (tabId: string) => void;
    tabs: Tab[];
}

export default function TournamentTabs({ activeTab, onTabChange, tabs }: Props) {
    const handleTabClick = (tabId: string) => {
        haptic.light();
        onTabChange(tabId);
    };

    return (
        <div style={{
            display: 'flex',
            gap: 'var(--spacing-1)',
            background: 'var(--color-surface)',
            padding: 'var(--spacing-1)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-6)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
        }}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    style={{
                        flex: 1,
                        minWidth: '80px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 'var(--spacing-1)',
                        padding: 'var(--spacing-3) var(--spacing-2)',
                        background: activeTab === tab.id
                            ? 'rgba(255, 107, 107, 0.2)'
                            : 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: activeTab === tab.id
                            ? 'var(--color-primary)'
                            : 'var(--color-text-dim)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '0.85rem',
                        fontWeight: activeTab === tab.id ? 'bold' : 'normal'
                    }}
                >
                    {tab.icon}
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
    );
}

// Export default tabs configuration — labels are passed from TournamentContent via i18n
export function getDefaultTabs(isTeamMode: boolean, t: (key: string) => string): Tab[] {
    return [
        { id: 'overview', label: t('overview'), icon: <LayoutGrid size={20} /> },
        { id: 'bracket', label: 'Bracket', icon: <Trophy size={20} /> },
        { id: 'players', label: isTeamMode ? t('teams') : t('players'), icon: <Users size={20} /> },
        { id: 'stats', label: 'Stats', icon: <BarChart3 size={20} /> }
    ];
}
