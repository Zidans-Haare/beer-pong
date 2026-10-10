'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import SheetDialog from './SheetDialog';

// Ersatz für window.confirm / window.alert: Browser-Dialoge werden in eingebetteten
// Ansichten und manchen Browsern stillschweigend unterdrückt – dann "passiert nichts".

interface ConfirmOptions {
    title?: string;
    confirmLabel?: string;
    // rote Bestätigung für Löschen & Co.
    danger?: boolean;
}

interface DialogApi {
    confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
    // ohne Text erscheint eine allgemeine Fehlermeldung
    alert: (message?: string | null, title?: string) => Promise<void>;
}

interface DialogState extends ConfirmOptions {
    kind: 'confirm' | 'alert';
    message: string;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useAppDialog(): DialogApi {
    const api = useContext(DialogContext);
    if (!api) throw new Error('useAppDialog braucht den AppDialogProvider');
    return api;
}

export default function AppDialogProvider({ children }: { children: ReactNode }) {
    const t = useTranslations('ui');
    const [state, setState] = useState<DialogState | null>(null);
    const resolver = useRef<((value: boolean) => void) | null>(null);

    const open = useCallback((next: DialogState) => new Promise<boolean>(resolve => {
        // ein noch offener Dialog gilt als abgebrochen
        resolver.current?.(false);
        resolver.current = resolve;
        setState(next);
    }), []);

    const close = useCallback((value: boolean) => {
        resolver.current?.(value);
        resolver.current = null;
        setState(null);
    }, []);

    const api = useRef<DialogApi>({
        confirm: (message, options) => open({ kind: 'confirm', message, ...options }),
        alert: (message, title) => open({ kind: 'alert', message: message ?? '', title }).then(() => undefined),
    });

    return (
        <DialogContext.Provider value={api.current}>
            {children}
            {state && (
                <SheetDialog title={state.title ?? (state.kind === 'confirm' ? t('confirmTitle') : t('noticeTitle'))} onClose={() => close(false)} className="app-dialog">
                    <p className="app-dialog-message">{state.message || t('genericError')}</p>
                    <div className="sheet-actions">
                        {state.kind === 'confirm' && <button type="button" className="btn btn-secondary" onClick={() => close(false)}>{t('cancel')}</button>}
                        <button type="button" autoFocus className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>
                            {state.confirmLabel ?? (state.kind === 'confirm' ? t('confirm') : t('ok'))}
                        </button>
                    </div>
                </SheetDialog>
            )}
        </DialogContext.Provider>
    );
}
