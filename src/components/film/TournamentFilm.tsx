'use client';

import { useMemo } from 'react';
import { drawTournamentFrame, filmTimeline, type FilmModel } from '@/lib/tournament-scene';
import { sharedFilmAudio, type FilmAudio } from '@/lib/tournament-audio';
import ScenePlayer, { type SceneSource } from '@/components/scene/ScenePlayer';

// Turnierfilm im Story-Player; Schließen führt zurück zum Turnier
export default function TournamentFilm({ model, tournamentId, initialTime }: { model: FilmModel; tournamentId: string; initialTime?: number }) {
    const source = useMemo<SceneSource>(() => {
        const timeline = filmTimeline(model);
        return {
            title: model.title,
            keys: timeline.keys,
            starts: timeline.starts,
            durations: timeline.durations,
            total: timeline.total,
            descriptions: timeline.keys.map(key => model.descriptions[key] || model.title),
            draw: (ctx, timeMs, assets) => drawTournamentFrame(ctx, model, timeMs, assets),
            schedule: (audio, fromMs) => (audio as FilmAudio).scheduleFilm(timeline, fromMs),
            audio: sharedFilmAudio,
            fileBase: 'bierpong-turnierfilm',
        };
    }, [model]);

    return <ScenePlayer source={source} initialTime={initialTime} closeHref={`/tournaments/${tournamentId}`} />;
}
