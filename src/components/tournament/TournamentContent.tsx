'use client';

import { useState } from 'react';
import TournamentTabs, { getDefaultTabs } from './TournamentTabs';

interface Props {
    isTeamMode: boolean;
    overviewContent: React.ReactNode;
    bracketContent: React.ReactNode;
    playersContent: React.ReactNode;
    statsContent: React.ReactNode;
    defaultTab?: string;
}

export default function TournamentContent({
    isTeamMode,
    overviewContent,
    bracketContent,
    playersContent,
    statsContent,
    defaultTab = 'overview'
}: Props) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const tabs = getDefaultTabs(isTeamMode);

    return (
        <div>
            <TournamentTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={tabs}
            />

            <div style={{ minHeight: '300px' }}>
                {activeTab === 'overview' && overviewContent}
                {activeTab === 'bracket' && bracketContent}
                {activeTab === 'players' && playersContent}
                {activeTab === 'stats' && statsContent}
            </div>
        </div>
    );
}
