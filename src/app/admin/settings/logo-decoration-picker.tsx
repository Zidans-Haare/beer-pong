'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Beer } from 'lucide-react';
import { setLogoDecoration } from '@/app/actions/admin';
import { DecorationMark, DecorationText } from '@/components/LogoDecoration';
import { DECORATION_MODES, type Decoration, type DecorationMode } from '@/lib/logo-decoration';
import { useAppDialog } from '@/components/AppDialog';

// Logo so, wie es in der Kopfzeile steht, mit der Deko
function LogoPreview({ decoration }: { decoration: Decoration | null }) {
    return (
        <span className="text-gradient logo-preview" aria-hidden="true">
            <span className="logo-mark"><Beer size={22} />{decoration && <DecorationMark decoration={decoration} />}</span>
            <span className="logo-text">Bier Pong{decoration && <DecorationText decoration={decoration} />}</span>
        </span>
    );
}

// Deko am Logo: automatisch nach Datum, aus, oder ein Anlass fest; darunter die Termine dieses Jahres
export default function LogoDecorationPicker({ current, today, calendar }: { current: DecorationMode; today: Decoration | null; calendar: { decoration: Decoration; from: string; to: string }[] }) {
    const t = useTranslations('admin.settings.logoDeco');
    const router = useRouter();
    const dialog = useAppDialog();
    const [mode, setMode] = useState<DecorationMode>(current);
    const [pending, startTransition] = useTransition();

    function choose(next: DecorationMode) {
        if (pending || next === mode) return;
        const before = mode;
        setMode(next);
        startTransition(async () => {
            const res = await setLogoDecoration(next);
            if (!res.success) { setMode(before); dialog.alert(res.error ?? t('error')); return; }
            router.refresh();
        });
    }

    return (
        <section className="logo-deco-picker" aria-labelledby="logo-deco-title">
            <h3 id="logo-deco-title">{t('title')}</h3>
            <p className="logo-deco-lead">{t('lead')}</p>
            <div className="logo-deco-options" role="radiogroup" aria-labelledby="logo-deco-title">
                {DECORATION_MODES.map(option => (
                    <button key={option} type="button" role="radio" aria-checked={mode === option} className="logo-deco-option" onClick={() => choose(option)} disabled={pending}>
                        <LogoPreview decoration={option === 'auto' ? today : option === 'off' ? null : option} />
                        <span className="logo-deco-option-name">{t(`mode.${option}`)}</span>
                        {option === 'auto' && <span className="logo-deco-option-hint">{today ? t('todayIs', { name: t(`mode.${today}`) }) : t('todayNone')}</span>}
                    </button>
                ))}
            </div>
            <details className="logo-deco-calendar">
                <summary>{t('calendar')}</summary>
                <ul>
                    {calendar.map((entry, i) => <li key={i}><strong>{t(`mode.${entry.decoration}`)}</strong> {entry.from} – {entry.to}</li>)}
                </ul>
            </details>
        </section>
    );
}
