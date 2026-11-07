'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { joinTournamentAction } from '@/app/actions/rsvp';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AutoJoin({ tournamentId, name }: { tournamentId: string; name: string }) {
    const t = useTranslations('join');
    const router = useRouter();
    const started = useRef(false);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (started.current) return;
        started.current = true;
        setError('');
        joinTournamentAction(tournamentId).then(result => {
            if (result.success) router.replace(`/tournaments/${tournamentId}`);
            else setError(result.error || t('connectionError'));
        }).catch(() => setError(t('connectionError')));
    }, [tournamentId, router, t, attempt]);
    return <div className="container auth-page">
        <div className="auth-heading"><div className="eyebrow">{t('title')}</div><h1>{name}</h1></div>
        {error ? <div className="form-stack"><p className="form-error" role="alert">{error}</p><button type="button" className="btn btn-secondary" onClick={() => { started.current = false; setAttempt(value => value + 1); }}><RefreshCw size={18} />{t('retry')}</button></div>
            : <div role="status" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><LoaderCircle size={22} className="loading-spin" />{t('joining')}</div>}
    </div>;
}