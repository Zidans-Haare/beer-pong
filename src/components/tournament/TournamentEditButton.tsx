'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Pencil, Minus, Plus, Check } from 'lucide-react';
import SheetDialog from '@/components/SheetDialog';
import { useAppDialog } from '@/components/AppDialog';
import { editTournament } from '@/app/actions/tournaments';

interface Props {
    tournament: { id: string; name: string; date: string; location: string; tableCount: number; mode: string; type: string; hasReturnLeg: boolean };
    players: { id: string; name: string }[];
    participantIds: string[];
    hostPlayerId: string | null;
}

// Datum als Wert für das Feld in Ortszeit
function toLocalInput(iso: string) {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

// Stift neben dem Turniernamen: Der Host ändert vor dem Start Zeit, Ort, Modus, Tische und wer dabei ist
export default function TournamentEditButton({ tournament, players, participantIds, hostPlayerId }: Props) {
    const t = useTranslations('tournaments');
    const router = useRouter();
    const appDialog = useAppDialog();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState(tournament.name);
    const [date, setDate] = useState(toLocalInput(tournament.date));
    const [location, setLocation] = useState(tournament.location);
    const [tables, setTables] = useState(tournament.tableCount);
    const [mode, setMode] = useState(tournament.mode);
    const [type, setType] = useState(tournament.type);
    const [returnLeg, setReturnLeg] = useState(tournament.hasReturnLeg);
    const [selected, setSelected] = useState<string[]>(participantIds);
    const [search, setSearch] = useState('');

    const start = () => {
        // immer mit dem aktuellen Stand öffnen
        setName(tournament.name); setDate(toLocalInput(tournament.date)); setLocation(tournament.location);
        setTables(tournament.tableCount); setMode(tournament.mode); setType(tournament.type); setReturnLeg(tournament.hasReturnLeg);
        setSelected(participantIds); setSearch('');
        setOpen(true);
    };

    // Angemeldete zuerst, dann alphabetisch
    const list = useMemo(() => {
        const q = search.trim().toLowerCase();
        return players
            .filter(p => !q || p.name.toLowerCase().includes(q))
            .sort((a, b) => Number(participantIds.includes(b.id)) - Number(participantIds.includes(a.id)) || a.name.localeCompare(b.name));
    }, [players, search, participantIds]);

    const toggle = (id: string) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

    async function save() {
        if (!name.trim() || !location.trim() || !date) { appDialog.alert(t('edit.missing')); return; }
        if (tournament.mode === 'TEAM' && mode === 'SOLO' && !await appDialog.confirm(t('edit.teamsReset'), { title: t('edit.title'), confirmLabel: t('edit.save') })) return;
        setSaving(true);
        const res = await editTournament(tournament.id, {
            name: name.trim(), date: new Date(date).toISOString(), location: location.trim(),
            tableCount: tables, mode: mode as 'SOLO' | 'TEAM', type: type as 'SINGLE_ELIMINATION', hasReturnLeg: returnLeg, participantIds: selected,
        });
        setSaving(false);
        if (!res.success) { appDialog.alert(res.error ?? t('edit.error')); return; }
        setOpen(false);
        router.refresh();
    }

    // alte Turniere heißen noch ELIMINATION; das ist dasselbe K.-o.
    const ko = type === 'ELIMINATION' ? 'ELIMINATION' : 'SINGLE_ELIMINATION';

    return (
        <>
            <button type="button" className="icon-button tournament-edit-button" onClick={start} aria-label={t('edit.title')} data-tooltip={t('edit.title')}>
                <Pencil size={20} aria-hidden="true" />
            </button>
            <SheetDialog title={t('edit.title')} open={open} onClose={() => setOpen(false)} className="tournament-edit">
                <div className="tournament-edit-fields">
                    <label className="form-group">
                        <span>{t('name')}</span>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
                    </label>
                    <label className="form-group">
                        <span>{t('edit.date')}</span>
                        <input type="datetime-local" className="date-input" value={date} onChange={e => setDate(e.target.value)} />
                    </label>
                    <label className="form-group">
                        <span>{t('edit.location')}</span>
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)} maxLength={200} />
                    </label>

                    <div className="form-group">
                        <span>{t('gameMode')}</span>
                        <div className="segmented-control">
                            <button type="button" className="segment" aria-pressed={mode === 'SOLO'} onClick={() => setMode('SOLO')}>1 vs 1</button>
                            <button type="button" className="segment" aria-pressed={mode === 'TEAM'} onClick={() => setMode('TEAM')}>2 vs 2</button>
                        </div>
                    </div>
                    <label className="form-group">
                        <span>{t('format')}</span>
                        <select value={type} onChange={e => setType(e.target.value)}>
                            <option value={ko}>{t('formatKO')}</option>
                            <option value="ROUND_ROBIN">{t('formatRoundRobin')}</option>
                            <option value="GROUPS">{t('formatGroups')}</option>
                        </select>
                    </label>
                    <label className="check-row">
                        <input type="checkbox" checked={returnLeg} onChange={e => setReturnLeg(e.target.checked)} />
                        <span>{t('returnLeg')}</span>
                    </label>

                    <div className="form-group">
                        <span>{t('tableCount')}</span>
                        <div className="tournament-edit-stepper">
                            <button type="button" className="btn btn-secondary" onClick={() => setTables(n => Math.max(1, n - 1))} disabled={tables <= 1} aria-label={t('edit.fewerTables')}><Minus size={18} /></button>
                            <output aria-live="polite">{tables}</output>
                            <button type="button" className="btn btn-secondary" onClick={() => setTables(n => Math.min(10, n + 1))} disabled={tables >= 10} aria-label={t('edit.moreTables')}><Plus size={18} /></button>
                        </div>
                    </div>

                    <fieldset className="form-group tournament-edit-players">
                        <legend>{t('edit.players')} <span className="tournament-edit-count">{selected.length}</span></legend>
                        <input type="search" placeholder={t('searchPlayers')} value={search} onChange={e => setSearch(e.target.value)} aria-label={t('searchPlayers')} />
                        <ul>
                            {list.map(p => {
                                const on = selected.includes(p.id);
                                return (
                                    <li key={p.id}>
                                        <button type="button" aria-pressed={on} onClick={() => toggle(p.id)}>
                                            <span className="tournament-edit-check" aria-hidden="true">{on && <Check size={14} />}</span>
                                            {p.name}
                                            {p.id === hostPlayerId && <span className="tournament-edit-host">Host</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </fieldset>
                </div>
                <div className="tournament-edit-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>{t('edit.cancel')}</button>
                    <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? t('edit.saving') : t('edit.save')}</button>
                </div>
            </SheetDialog>
        </>
    );
}
