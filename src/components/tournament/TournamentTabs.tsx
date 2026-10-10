'use client';

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
        <div className="tournament-tabs" role="tablist">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className="tournament-tab"
                    onClick={() => handleTabClick(tab.id)}
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
