'use client';

import { useEffect, useMemo } from 'react';
import { drawWrappedFrame, sceneTimeline, SEGMENT_MS, type SceneModel } from '@/lib/wrapped-scene';
import { markWrappedSeen } from '@/app/actions/wrapped';
import { sharedWrappedAudio } from '@/lib/wrapped-audio';
import ScenePlayer, { type SceneSource } from '@/components/scene/ScenePlayer';

// wrappedId fehlt in der Admin-Vorschau; dann wird nichts als gesehen vermerkt
export default function WrappedStory({ model, initialTime, wrappedId }: { model: SceneModel; initialTime?: number; wrappedId?: string }) {
    const source = useMemo<SceneSource>(() => {
        const timeline = sceneTimeline(model);
        return {
            title: model.title,
            keys: model.segments.map(s => s.key),
            starts: timeline.starts,
            durations: model.segments.map(s => SEGMENT_MS[s.key]),
            total: timeline.total,
            descriptions: model.segments.map(s => [s.eyebrow, s.value, s.title, ...s.lines].join('. ')),
            draw: (ctx, timeMs, assets) => drawWrappedFrame(ctx, model, timeMs, assets),
            schedule: (audio, fromMs) => audio.schedule(timeline, fromMs),
            audio: sharedWrappedAudio,
            fileBase: 'bierpong-wrapped',
        };
    }, [model]);

    useEffect(() => { if (wrappedId) markWrappedSeen(wrappedId); }, [wrappedId]);

    return <ScenePlayer source={source} initialTime={initialTime} closeHref="/" />;
}
