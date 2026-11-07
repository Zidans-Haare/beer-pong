'use client';

import { updateMatchResult } from '@/app/actions/matches';
import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTeamDisplayName } from '@/lib/team-utils';
import { Check, ChevronLeft, LoaderCircle, RefreshCw, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import SheetDialog from './SheetDialog';

export default function MatchEditForm({ match, onClose }: { match: any, onClose: () => void }) {
    const t = useTranslations('match');
    const router = useRouter();
    const isTeamMatch = !!match.team1Id && !!match.team2Id;
    const fieldId = useId();
    const savingRef = useRef(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // For team matches: use winnerTeamId, for solo: use winnerId
    const currentWinner = isTeamMatch ? match.winnerTeamId : match.winnerId;
    const [winnerId, setWinnerId] = useState<string | null>(currentWinner || null);

    // Reconstruct state from existing scores
    const getInitialState = () => {
        if (!currentWinner) return { cups: null as number | null, ot: false, otRounds: 0, otLoserCups: null as number | null };
        const loserScore = isTeamMatch
            ? (currentWinner === match.team1Id ? match.score2 : match.score1)
            : (currentWinner === match.player1Id ? match.score2 : match.score1);
        if (loserScore < 10) return { cups: loserScore, ot: false, otRounds: 0, otLoserCups: null };
        // OT: loserScore = 10 + completedOtRounds*3 + otLoserCups
        const above10 = loserScore - 10;
        const completedOtRounds = Math.floor(above10 / 3);
        const otLC = above10 % 3;
        return { cups: null, ot: true, otRounds: completedOtRounds, otLoserCups: otLC };
    };
    const init = getInitialState();
    const [loserCupsStr, setLoserCupsStr] = useState<string>(init.cups !== null ? init.cups.toString() : '');
    const [isOT, setIsOT] = useState(init.ot);
    const [otRounds, setOtRounds] = useState(init.otRounds);
    const [otLoserCups, setOtLoserCups] = useState<number | null>(init.otLoserCups);

    // Get display names
    const team1Name = match.team1 ? getTeamDisplayName(match.team1) : 'Team 1';
    const team2Name = match.team2 ? getTeamDisplayName(match.team2) : 'Team 2';
    const player1Name = match.player1?.name || t('player1');
    const player2Name = match.player2?.name || t('player2');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (savingRef.current) return;
        if (!winnerId) return setError(t('selectWinner'));
        const loserCups = parseInt(loserCupsStr);
        if (!isOT && (loserCupsStr === '' || isNaN(loserCups) || loserCups < 0 || loserCups > 9)) return setError(t('cupsError'));
        if (isOT && otLoserCups === null) return setError(t('otCupsError'));

        const isTeam1Winner = isTeamMatch ? winnerId === match.team1Id : winnerId === match.player1Id;

        let winnerScore: number;
        let loserScore: number;
        if (!isOT) {
            winnerScore = 10;
            loserScore = loserCups;
        } else {
            // winner always clears all OT cups in the decisive round
            winnerScore = 10 + (otRounds + 1) * 3;
            loserScore = 10 + otRounds * 3 + otLoserCups!;
        }

        const score1 = isTeam1Winner ? winnerScore : loserScore;
        const score2 = isTeam1Winner ? loserScore : winnerScore;

        savingRef.current = true;
        setIsSaving(true);
        setError('');
        try {
            const result = await updateMatchResult(match.id, score1, score2);
            if (!result.success) {
                setError(result.error || t('saveError'));
                return;
            }
            onClose();
            router.refresh();
        } catch {
            setError(t('saveError'));
        } finally {
            savingRef.current = false;
            setIsSaving(false);
        }
    }

    const handleWinnerClick = (id: string) => {
        setWinnerId(id);
        setLoserCupsStr('');
        setIsOT(false);
        setOtRounds(0);
        setOtLoserCups(null);
    };

    const handleOtLoserCups = (n: number) => {
        if (n === 3) {
            // Both hit all OT cups → next OT round
            setOtRounds(r => r + 1);
            setOtLoserCups(null);
        } else {
            setOtLoserCups(n);
        }
    };

    return (
        <SheetDialog title={match.isPlayed ? t('correctResult') : t('editResult')} onClose={() => { if (!savingRef.current) onClose(); }} className="score-sheet">
            <form onSubmit={handleSubmit}>
                <fieldset disabled={isSaving} className="score-fields">
                    <legend className="form-label">{t('whoWon')}</legend>
                    <div className="winner-options">
                        {[
                            { id: isTeamMatch ? match.team1Id : match.player1Id, name: isTeamMatch ? team1Name : player1Name },
                            { id: isTeamMatch ? match.team2Id : match.player2Id, name: isTeamMatch ? team2Name : player2Name },
                        ].map(side => <button key={side.id} type="button" className="winner-option" aria-pressed={winnerId === side.id} onClick={() => handleWinnerClick(side.id)}>
                            <span className="winner-marker">{winnerId === side.id ? <Check size={18} /> : null}</span>
                            <span>{side.name}</span>
                        </button>)}
                    </div>
                    {winnerId && !isOT && <div className="form-stack">
                        <div className="form-field">
                            <label htmlFor={fieldId} className="form-label">{t('loserCups')}</label>
                            <input id={fieldId} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1} className="score-input" placeholder="0–9" value={loserCupsStr}
                                onChange={event => { const value = event.target.value.replace(/[^0-9]/g, ''); if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 9)) setLoserCupsStr(value); }}
                                onFocus={event => event.target.select()} />
                        </div>
                        <div className="cup-options" aria-label={t('loserCups')}>
                            {Array.from({ length: 10 }, (_, number) => <button key={number} type="button" className="cup-option" aria-pressed={loserCupsStr === String(number)} onClick={() => setLoserCupsStr(String(number))}>{number}</button>)}
                        </div>
                        <button type="button" className="btn btn-secondary" onClick={() => { setIsOT(true); setLoserCupsStr(''); }}><RefreshCw size={18} />{t('overtime')}</button>
                    </div>}
                    {winnerId && isOT && <div className="form-stack">
                        <div className="ot-round" role="status"><RefreshCw size={18} />{otRounds > 0 ? t('otRound', { round: otRounds + 1 }) : t('otBase')}</div>
                        <div className="form-label">{t('loserCupsOT')}</div>
                        <div className="cup-options ot-options">
                            {[0, 1, 2].map(number => <button key={number} type="button" className="cup-option" aria-pressed={otLoserCups === number} onClick={() => setOtLoserCups(number)}>{number}</button>)}
                            <button type="button" className="cup-option" onClick={() => handleOtLoserCups(3)} title={t('nextOT')}>OT+</button>
                        </div>
                        <button type="button" className="btn btn-quiet" onClick={() => { setIsOT(false); setOtRounds(0); setOtLoserCups(null); }}><ChevronLeft size={18} />{t('back')}</button>
                    </div>}
                </fieldset>
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="sheet-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>{t('cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving || !winnerId || (!isOT && loserCupsStr === '') || (isOT && otLoserCups === null)}>{isSaving ? <LoaderCircle size={18} className="loading-spin" /> : <Save size={18} />}{t('save')}</button>
                </div>
            </form>
        </SheetDialog>
    );
}
