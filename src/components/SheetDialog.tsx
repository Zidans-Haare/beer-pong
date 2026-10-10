'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

let locks = 0;
let previousOverflow = '';

export default function SheetDialog({ title, children, open = true, onClose, className = '' }: { title: string; children: ReactNode; open?: boolean; onClose: () => void; className?: string }) {
    const t = useTranslations('ui');
    const titleId = useId();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const closeRef = useRef(onClose);
    const [mounted, setMounted] = useState(false);
    closeRef.current = onClose;

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!mounted || !dialog || !open) return;
        const previousFocus = document.activeElement as HTMLElement | null;
        if (locks === 0) previousOverflow = document.body.style.overflow;
        locks++;
        document.body.style.overflow = 'hidden';
        if (!dialog.open) dialog.showModal();
        return () => {
            dialog.close();
            locks--;
            if (locks === 0) document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        };
    }, [mounted, open]);

    if (!mounted || !open) return null;
    return createPortal(
        <dialog ref={dialogRef} className={`sheet-dialog ${className}`} aria-labelledby={titleId}
            onCancel={event => { event.preventDefault(); closeRef.current(); }}
            onClick={event => {
                if (event.target !== event.currentTarget) return;
                const rect = event.currentTarget.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeRef.current();
            }}>
            <header className="sheet-header">
                <h2 id={titleId}>{title}</h2>
                <button type="button" className="icon-button" aria-label={t('close')} data-tooltip={t('close')} onClick={() => closeRef.current()}><X size={22} /></button>
            </header>
            <div className="sheet-body">{children}</div>
        </dialog>, document.body,
    );
}