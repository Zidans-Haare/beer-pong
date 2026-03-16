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
            borderBottom: '1px solid var(--color-border)',
            marginBottom: 'var(--spacing-6)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            gap: 'var(--spacing-6)',
        }}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '12px 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: '-1px',
                        color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-dim)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: activeTab === tab.id ? 700 : 600,
                        whiteSpace: 'nowrap',
                        transition: 'color 0.15s ease',
                    }}
                >
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
    );
}

// Export default tabs configuration
export function getDefaultTabs(isTeamMode: boolean): Tab[] {
    return [
        { id: 'overview', label: 'Übersicht', icon: <LayoutGrid size={20} /> },
        { id: 'bracket', label: 'Bracket', icon: <Trophy size={20} /> },
        { id: 'players', label: isTeamMode ? 'Teams' : 'Spieler', icon: <Users size={20} /> },
        { id: 'stats', label: 'Stats', icon: <BarChart3 size={20} /> }
    ];
}
