'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, Shirt, Film, BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import SheetDialog from '@/components/SheetDialog';
import { useDrunkMode } from '@/context/DrunkModeContext';

// Bei jedem größeren Update diese Kennung ändern, dann sehen alle den Hinweis noch einmal
export const WHATS_NEW_VERSION = '2026-11';
const STORAGE_KEY = 'whats-new-seen';
// Auf diesen Seiten würde das Fenster stören
const QUIET = /^\/(?:login|register|join|offline|wrapped|demo)|\/(?:tv|broadcast)$/;

function seenVersion(): string | null {
    try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

// „Später“: in dieser Sitzung nicht mehr fragen, beim nächsten Öffnen der App wieder
function snoozed(): boolean {
    try { return window.sessionStorage.getItem(STORAGE_KEY) === WHATS_NEW_VERSION; } catch { return false; }
}

function snooze() {
    try { window.sessionStorage.setItem(STORAGE_KEY, WHATS_NEW_VERSION); } catch { /* egal */ }
}

function remember() {
    try { window.localStorage.setItem(STORAGE_KEY, WHATS_NEW_VERSION); } catch { /* ohne Speicher erscheint es eben wieder */ }
}

export default function WhatsNew() {
    const t = useTranslations('whatsNew');
    const pathname = usePathname();
    const { isDrunk } = useDrunkMode();
    const [open, setOpen] = useState(false);
    const quiet = QUIET.test(pathname) || isDrunk;

    useEffect(() => {
        if (quiet || seenVersion() === WHATS_NEW_VERSION || snoozed()) return;
        // kurz warten, damit die Seite erst fertig aufgebaut ist
        const timer = setTimeout(() => setOpen(true), 1200);
        return () => clearTimeout(timer);
    }, [quiet]);

    const close = () => { remember(); setOpen(false); };
    const later = () => { snooze(); setOpen(false); };

    const items = [
        { href: '/game', icon: Gamepad2, key: 'game' },
        { href: '/players/me', icon: Shirt, key: 'figure' },
        { href: '/tournaments', icon: Film, key: 'film' },
        { href: '/rules', icon: BookOpen, key: 'rules' },
    ] as const;

    return (
        <SheetDialog title={t('title')} open={open && !quiet} onClose={later} className="whats-new">
            <p className="whats-new-intro">{t('intro')}</p>
            <ul className="whats-new-list">
                {items.map(({ href, icon: Icon, key }) => (
                    <li key={key}>
                        <Link href={href} className="whats-new-item" onClick={close}>
                            <span className="whats-new-icon" aria-hidden="true"><Icon size={22} /></span>
                            <span>
                                <strong>{t(`${key}.title`)}</strong>
                                <small>{t(`${key}.text`)}</small>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
            <div className="whats-new-actions">
                <button type="button" className="btn btn-secondary" onClick={later}>{t('later')}</button>
                <button type="button" className="btn btn-primary" onClick={close}>{t('gotIt')}</button>
            </div>
        </SheetDialog>
    );
}
