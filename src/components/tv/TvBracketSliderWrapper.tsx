'use client';

import { useEffect, useState } from 'react';
import TvBracketSlider from './TvBracketSlider';

type Round = Parameters<typeof TvBracketSlider>[0]['rounds'][number];

export default function TvBracketSliderWrapper(props: { rounds: Round[]; compact?: boolean }) {
    // On mobile landscape (small height), show all matches so the user can scroll
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        function check() {
            setShowAll(window.innerHeight < 540 && window.innerWidth > window.innerHeight);
        }
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    return <TvBracketSlider {...props} showAll={showAll} />;
}
