'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dices, RotateCcw, Check, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { loadSceneFonts, drawBackdrop, drawMe, drawHairFront, drawAccessoryFront, fillShirt, roundRect, type FigureLook, type HairStyle, type ShirtPattern, type Accessory } from '@/lib/wrapped-scene';
import { drawWalker } from '@/lib/tournament-scene';
import {
    SKINS, HAIR_COLORS, SHIRTS, HAIR_STYLES, PATTERNS, HEADWEAR, EYEWEAR, EXTRAS, defaultFigure, randomFigure, lookFor, nameKey, toggleAccessory, MOONZY_SKIN, type FigureSpec,
} from '@/lib/figure';
import { saveFigure, resetFigure } from '@/app/actions/figure';

// Kleines Bild für eine Auswahl: wird mit dem aktuellen Aussehen gezeichnet, damit man sieht, wie es an einem selbst wirkt
function Thumb({ draw, size = 64 }: { draw: (ctx: CanvasRenderingContext2D) => void; size?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const ctx = ref.current?.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, size, size);
        draw(ctx);
    });
    return <canvas ref={ref} width={size} height={size} aria-hidden="true" />;
}

// Kopf von vorn für die Auswahl von Frisuren und Zubehör
function headThumb(ctx: CanvasRenderingContext2D, look: FigureLook) {
    const r = 21;
    ctx.save();
    ctx.translate(32, 36);
    drawHairFront(ctx, r, look, true);
    ctx.fillStyle = look.skin ?? '#fbe3c0';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    drawHairFront(ctx, r, look, false);
    ctx.fillStyle = '#2a1f14';
    ctx.beginPath(); ctx.arc(-7.5, -1.5, 2.6, 0, Math.PI * 2); ctx.arc(7.5, -1.5, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a1f14'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, 7.5); ctx.quadraticCurveTo(0, 12, 7, 7.5); ctx.stroke();
    drawAccessoryFront(ctx, r, look);
    ctx.restore();
}

// Oberkörper mit Muster
function shirtThumb(ctx: CanvasRenderingContext2D, look: FigureLook) {
    ctx.save();
    ctx.translate(6, 8);
    fillShirt(ctx, look, look.shirt, () => roundRect(ctx, 0, 0, 52, 48, 16), { x: 0, y: 0, w: 52, h: 48 });
    ctx.restore();
}

// Ganze Figur klein, für Größe und Statur
function bodyThumb(ctx: CanvasRenderingContext2D, look: FigureLook) {
    drawWalker(ctx, 32, 62, 0.135, look, { walk: 0, cheer: 0, medal: 0, place: 3, crown: 0, time: 0 });
}

// Editor für die eigene Figur: Vorschau von vorn (Podium) und von hinten (am Tisch), Auswahl mit kleinen Bildern
export default function FigureEditor({ name, initial, custom, lockedSkin }: { name: string; initial: FigureSpec; custom: boolean; lockedSkin: boolean }) {
    const t = useTranslations('figure');
    const router = useRouter();
    const [spec, setSpec] = useState<FigureSpec>(initial);
    const [saved, setSaved] = useState(initial);
    const [isCustom, setIsCustom] = useState(custom);
    const [message, setMessage] = useState<string | null>(null);
    const [cheer, setCheer] = useState(true);
    const [pending, startTransition] = useTransition();
    const front = useRef<HTMLCanvasElement>(null);
    const back = useRef<HTMLCanvasElement>(null);
    const specRef = useRef(spec);
    specRef.current = spec;
    const cheerRef = useRef(cheer);
    cheerRef.current = cheer;
    const [ready, setReady] = useState(false);

    useEffect(() => { loadSceneFonts().then(() => setReady(true)); }, []);

    // Vorschau: von vorn (wie auf dem Podium) und von hinten (wie am Tisch)
    useEffect(() => {
        if (!ready) return;
        const primary = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#006b50';
        let frame = 0;
        const tick = (now: number) => {
            const look = lookFor(name, 0, { [nameKey(name)]: specRef.current });
            const a = front.current?.getContext('2d');
            if (a) {
                a.clearRect(0, 0, 540, 720);
                a.save();
                a.scale(0.5, 0.375);
                drawBackdrop(a, primary, now, 0.5);
                a.restore();
                drawWalker(a, 270, 650, 1.05, look, { walk: 0, cheer: cheerRef.current ? 1 : 0, medal: 0, place: 1, crown: 0, time: now });
            }
            const b = back.current?.getContext('2d');
            if (b) {
                b.clearRect(0, 0, 420, 300);
                b.save();
                b.scale(0.5, 0.5 * 0.375 / 0.5);
                drawBackdrop(b, primary, now, 0.5);
                b.restore();
                b.save();
                b.scale(0.4, 0.4);
                b.translate(-15, -1575);
                drawMe(b, 1, 0, cheerRef.current ? 0.6 : 0, now, primary, look);
                b.restore();
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [ready, name]);

    const set = <K extends keyof FigureSpec>(key: K, value: FigureSpec[K]) => { setSpec(prev => ({ ...prev, [key]: value })); setMessage(null); };
    const changed = JSON.stringify(spec) !== JSON.stringify(saved);
    // Aussehen, das die Auswahlbilder als Grundlage nehmen
    const me = lookFor(name, 0, { [nameKey(name)]: spec });
    const withLook = (extra: Partial<FigureLook>): FigureLook => ({ ...me, ...extra });

    const save = () => startTransition(async () => {
        const result = await saveFigure(spec);
        if (result.success) { setSaved(spec); setIsCustom(true); setMessage(t('saved')); router.refresh(); } else setMessage(result.error);
    });
    const reset = () => startTransition(async () => {
        const result = await resetFigure();
        if (result.success) { const def = defaultFigure(name); setSpec(def); setSaved(def); setIsCustom(false); setMessage(t('resetDone')); router.refresh(); } else setMessage(result.error);
    });

    const swatches = (palette: readonly string[], current: number, onPick: (i: number) => void, label: string, disabled = false) => (
        <div className="figure-swatches" role="radiogroup" aria-label={label}>
            {palette.map((color, i) => (
                <button key={color} type="button" role="radio" aria-checked={current === i} aria-label={`${label} ${i + 1}`} disabled={disabled} className={`figure-swatch${current === i ? ' is-on' : ''}`} style={{ background: color }} onClick={() => onPick(i)} />
            ))}
        </div>
    );
    // Kachel mit kleinem Bild und Beschriftung; `radio` für genau eine Wahl, sonst ein Schalter
    const tile = (key: string, label: string, on: boolean, onClick: () => void, draw: (ctx: CanvasRenderingContext2D) => void, kind: 'radio' | 'toggle' = 'radio', special = false) => (
        <button key={key} type="button" {...(kind === 'radio' ? { role: 'radio', 'aria-checked': on } : { 'aria-pressed': on })} className={`figure-tile${on ? ' is-on' : ''}${special ? ' is-special' : ''}`} onClick={onClick}>
            <Thumb draw={draw} />
            <span>{label}</span>
            {special && <Sparkles className="figure-tile-star" size={14} aria-hidden="true" />}
        </button>
    );
    const hat = spec.accessories.find(a => HEADWEAR.includes(a)) ?? null;
    const glasses = spec.accessories.find(a => EYEWEAR.includes(a)) ?? null;
    const pick = (item: Accessory | null, group: Accessory[]) => set('accessories', item ? toggleAccessory(spec.accessories.filter(a => !group.includes(a)), item) : spec.accessories.filter(a => !group.includes(a)));
    const accessoryLook = (item: Accessory): FigureLook => withLook({ accessories: [item], hairStyle: me.hairStyle });

    return (
        <div className="figure-editor">
            <div className="figure-preview">
                <canvas ref={front} width={540} height={720} role="img" aria-label={t('previewFront')} />
                <canvas ref={back} width={420} height={300} role="img" aria-label={t('previewBack')} />
                <label className="figure-cheer"><input type="checkbox" checked={cheer} onChange={e => setCheer(e.target.checked)} /> {t('cheer')}</label>
            </div>

            <div className="figure-options">
                <section className="figure-card">
                    <h2>{t('skin')}</h2>
                    {swatches(SKINS, lockedSkin ? MOONZY_SKIN : spec.skin, i => set('skin', i), t('skin'), lockedSkin)}
                    {lockedSkin && <p className="figure-note">{t('skinLocked')}</p>}
                </section>

                <section className="figure-card">
                    <h2>{t('hair')}</h2>
                    <div className="figure-tiles" role="radiogroup" aria-label={t('hair')}>
                        {HAIR_STYLES.map(style => tile(style, t(`hairStyle.${style}`), spec.hairStyle === style, () => set('hairStyle', style), ctx => headThumb(ctx, withLook({ hairStyle: style as HairStyle, accessories: [] }))))}
                    </div>
                    {spec.hairStyle !== 'bald' && (<><h3>{t('hairColor')}</h3>{swatches(HAIR_COLORS, spec.hairColor, i => set('hairColor', i), t('hairColor'))}</>)}
                </section>

                <section className="figure-card">
                    <h2>{t('outfit')}</h2>
                    <h3>{t('shirtColor')}</h3>
                    {swatches(SHIRTS, spec.shirt, i => set('shirt', i), t('shirtColor'))}
                    <h3>{t('patternLabel')}</h3>
                    <div className="figure-tiles" role="radiogroup" aria-label={t('patternLabel')}>
                        {PATTERNS.map(pattern => tile(pattern, t(`pattern.${pattern}`), spec.pattern === pattern, () => set('pattern', pattern), ctx => shirtThumb(ctx, withLook({ pattern: pattern as ShirtPattern }))))}
                    </div>
                </section>

                <section className="figure-card">
                    <h2>{t('body')}</h2>
                    <h3>{t('heightLabel')}</h3>
                    <div className="figure-tiles" role="radiogroup" aria-label={t('heightLabel')}>
                        {([0, 1, 2] as const).map(h => tile(`h${h}`, t(`height.${h}`), spec.height === h, () => set('height', h), ctx => bodyThumb(ctx, withLook({ heightScale: [0.92, 1, 1.08][h], accessories: [] }))))}
                    </div>
                    <h3>{t('buildLabel')}</h3>
                    <div className="figure-tiles" role="radiogroup" aria-label={t('buildLabel')}>
                        {([0, 1, 2] as const).map(b => tile(`b${b}`, t(`build.${b}`), spec.build === b, () => set('build', b), ctx => bodyThumb(ctx, withLook({ widthScale: [0.88, 1, 1.14][b], accessories: [] }))))}
                    </div>
                </section>

                <section className="figure-card">
                    <h2>{t('accessory')}</h2>
                    <p className="figure-note">{t('accessoryHint')}</p>
                    <h3>{t('headwear')}</h3>
                    <div className="figure-tiles" role="radiogroup" aria-label={t('headwear')}>
                        {tile('hat-none', t('acc.none'), hat === null, () => pick(null, HEADWEAR), ctx => headThumb(ctx, withLook({ accessories: [] })))}
                        {HEADWEAR.map(item => tile(item, t(`acc.${item}`), hat === item, () => pick(item, HEADWEAR), ctx => headThumb(ctx, accessoryLook(item)), 'radio', item === 'beerhat'))}
                    </div>
                    <h3>{t('eyewear')}</h3>
                    <div className="figure-tiles" role="radiogroup" aria-label={t('eyewear')}>
                        {tile('eye-none', t('acc.none'), glasses === null, () => pick(null, EYEWEAR), ctx => headThumb(ctx, withLook({ accessories: [] })))}
                        {EYEWEAR.map(item => tile(item, t(`acc.${item}`), glasses === item, () => pick(item, EYEWEAR), ctx => headThumb(ctx, accessoryLook(item))))}
                    </div>
                    <h3>{t('extras')}</h3>
                    <div className="figure-tiles">
                        {EXTRAS.map(item => tile(item, t(`acc.${item}`), spec.accessories.includes(item), () => set('accessories', toggleAccessory(spec.accessories, item)), ctx => {
                            // Schal und Kette sitzen am Oberkörper: der Kopf allein zeigt sie nicht
                            if (item === 'scarf' || item === 'chain') { ctx.save(); ctx.translate(32, 44); ctx.scale(0.5, 0.5); bodyThumbTorso(ctx, accessoryLook(item), item); ctx.restore(); } else headThumb(ctx, accessoryLook(item));
                        }, 'toggle'))}
                    </div>
                </section>

                <div className="figure-bar">
                    <span className="figure-bar-state" aria-live="polite">{message ?? (changed ? t('unsaved') : isCustom ? t('allSaved') : t('notYet'))}</span>
                    <div className="figure-actions">
                        <button type="button" className="btn btn-primary" disabled={pending || !changed} onClick={save}><Check size={16} aria-hidden="true" /> {t('save')}</button>
                        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => { setSpec(randomFigure(name)); setMessage(null); }}><Dices size={16} aria-hidden="true" /> {t('random')}</button>
                        <button type="button" className="btn btn-secondary" disabled={pending || (!isCustom && !changed)} onClick={reset}><RotateCcw size={16} aria-hidden="true" /> {t('reset')}</button>
                    </div>
                </div>
                <p className="figure-note">{t('where')}</p>
            </div>
        </div>
    );
}

// Oberkörper mit Schal oder Kette für das kleine Bild der Extras
function bodyThumbTorso(ctx: CanvasRenderingContext2D, look: FigureLook, item: Accessory) {
    ctx.fillStyle = look.shirt;
    roundRect(ctx, -52, -4, 104, 90, 34); ctx.fill();
    ctx.fillStyle = look.skin ?? '#fbe3c0';
    ctx.beginPath(); ctx.arc(0, -34, 36, 0, Math.PI * 2); ctx.fill();
    if (item === 'scarf') {
        ctx.fillStyle = '#d83a3a'; roundRect(ctx, -46, -8, 92, 26, 12); ctx.fill();
        roundRect(ctx, 10, 6, 22, 56, 9); ctx.fill();
    } else {
        ctx.strokeStyle = '#ffd95a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(0, 46, 26, 0); ctx.stroke();
        ctx.fillStyle = '#ffd95a'; ctx.beginPath(); ctx.arc(0, 32, 9, 0, Math.PI * 2); ctx.fill();
    }
}
