'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { SCENE_THEMES, drawSceneBackdrop, type SceneTheme } from '@/lib/scene-theme';
import { drawTable, loadSceneFonts, SCENE_WIDTH } from '@/lib/wrapped-scene';
import { setSceneTheme } from '@/app/actions/scene-theme';
import { useAppDialog } from '@/components/AppDialog';

// Ausschnitt der Szene für die Vorschau: Hintergrund und Tisch, oben beschnitten
const CROP_TOP = 150, CROP_H = 1500;
const W = 216, H = Math.round((W / SCENE_WIDTH) * CROP_H);

// Fünf Hintergründe zur Wahl, jeweils mit laufender Vorschau; der gewählte jubelt kurz
export default function SceneThemePicker({ current }: { current: SceneTheme }) {
    const t = useTranslations('sceneTheme');
    const router = useRouter();
    const dialog = useAppDialog();
    const [selected, setSelected] = useState<SceneTheme>(current);
    const [pending, startTransition] = useTransition();
    const canvases = useRef<Partial<Record<SceneTheme, HTMLCanvasElement | null>>>({});
    const chosenAt = useRef(-Infinity);

    useEffect(() => {
        let frame = 0;
        let alive = true;
        const primary = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#006b50';
        const draw = (now: number) => {
            for (const theme of SCENE_THEMES) {
                const ctx = canvases.current[theme]?.getContext('2d');
                if (!ctx) continue;
                const cheer = theme === selected ? Math.max(0, 1 - (now - chosenAt.current) / 2200) : 0;
                ctx.save();
                ctx.scale(W / SCENE_WIDTH, W / SCENE_WIDTH);
                ctx.translate(0, -CROP_TOP);
                drawSceneBackdrop(ctx, theme, primary, now, 0.5, cheer);
                drawTable(ctx, primary);
                ctx.restore();
            }
            if (alive) frame = requestAnimationFrame(draw);
        };
        void loadSceneFonts().then(() => { if (alive) frame = requestAnimationFrame(draw); });
        return () => { alive = false; cancelAnimationFrame(frame); };
    }, [selected]);

    function choose(theme: SceneTheme) {
        if (pending || theme === selected) return;
        const before = selected;
        setSelected(theme);
        chosenAt.current = performance.now();
        startTransition(async () => {
            const res = await setSceneTheme(theme);
            if (!res.success) { setSelected(before); dialog.alert(res.error ?? t('error')); return; }
            router.refresh();
        });
    }

    return (
        <section className="theme-picker" aria-labelledby="theme-picker-title">
            <h2 id="theme-picker-title">{t('title')}</h2>
            <p className="theme-picker-lead">{t('lead')}</p>
            <div className="theme-picker-grid" role="radiogroup" aria-labelledby="theme-picker-title">
                {SCENE_THEMES.map(theme => (
                    <button key={theme} type="button" role="radio" aria-checked={selected === theme} className="theme-tile" onClick={() => choose(theme)}>
                        <canvas ref={el => { canvases.current[theme] = el; }} width={W} height={H} aria-hidden="true" />
                        <span className="theme-tile-name">
                            {selected === theme && <Check size={14} aria-hidden="true" />}
                            {t(`name.${theme}`)}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
}
