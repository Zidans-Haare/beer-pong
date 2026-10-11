import { getSystemSettings, updateSystemSettings } from '@/app/actions/admin';
import { getGlobalDurationStats, getDurationBreakdown, formatDuration } from '@/lib/duration';
import { Clock, Users, BarChart3, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { getTranslations } from 'next-intl/server';

export default async function AdminSettingsPage() {
    const [settings, durationStats, breakdown, t] = await Promise.all([getSystemSettings(), getGlobalDurationStats(), getDurationBreakdown(), getTranslations('admin.settings')]);

    async function handleSubmit(formData: FormData) {
        'use server';
        await updateSystemSettings(formData);
    }

    return (
        <div className="card" style={{ maxWidth: '600px' }}>
            <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>{t('title')}</h2>

            {/* Smart Duration: Zusammenfassung, aufklappbar für Details */}
            <details className={`duration-box${durationStats.isCalculated ? '' : ' is-default'}`}>
                <summary className="duration-summary">
                    <span className="duration-summary-head">
                        <BarChart3 size={18} aria-hidden="true" />
                        <span style={{ fontWeight: 600 }}>{t('smartDuration')}</span>
                        {durationStats.isCalculated ? <CheckCircle size={14} aria-hidden="true" /> : <AlertCircle size={14} aria-hidden="true" />}
                        <ChevronDown size={18} className="duration-chevron" aria-hidden="true" />
                    </span>
                    <span className="duration-value">
                        <strong>{durationStats.averageMinutes}</strong>
                        <span>{durationStats.isCalculated ? t('avgMin') : t('defaultMin')}</span>
                    </span>
                    <span className="duration-note">
                        {durationStats.isCalculated ? t('basedOn', { count: durationStats.matchCount }) : t('notEnoughData', { count: durationStats.matchCount })}
                    </span>
                    <span className="duration-more">{t('showDetails')}</span>
                </summary>

                <div className="duration-details">
                    <h3>{t('howItWorks')}</h3>
                    <ol>
                        <li>{t('step1', { min: breakdown.thresholds.minMatches })}</li>
                        <li>{t('step2', { min: breakdown.thresholds.minMatches })}</li>
                        <li>{t('step3', { minutes: breakdown.thresholds.defaultMinutes })}</li>
                    </ol>

                    {breakdown.count > 0 && (
                        <>
                            <h3>{t('distribution')}</h3>
                            <dl className="duration-grid">
                                <div><dt>{t('median')}</dt><dd>{formatDuration(breakdown.medianSeconds)}</dd></div>
                                <div><dt>{t('fastest')}</dt><dd>{formatDuration(breakdown.fastestSeconds)}</dd></div>
                                <div><dt>{t('slowest')}</dt><dd>{formatDuration(breakdown.slowestSeconds)}</dd></div>
                                <div><dt>{t('typicalRange')}</dt><dd>{formatDuration(breakdown.fastSeconds)} – {formatDuration(breakdown.slowSeconds)}</dd></div>
                                <div><dt>{t('measured')}</dt><dd>{breakdown.count}</dd></div>
                                <div><dt>{t('unmeasured')}</dt><dd>{breakdown.matchesWithoutDuration}</dd></div>
                            </dl>

                            <h3>{t('byStage')}</h3>
                            <table className="duration-table">
                                <tbody>
                                    {breakdown.byStage.map(s => (
                                        <tr key={s.stage}><th scope="row">{s.stage === 'BRACKET' ? t('stageBracket') : t('stageLeague')}</th><td>{formatDuration(s.averageSeconds)}</td><td>{t('nGames', { count: s.count })}</td></tr>
                                    ))}
                                    {breakdown.byTable.map(tb => (
                                        <tr key={`t${tb.table}`}><th scope="row">{t('table', { number: tb.table })}</th><td>{formatDuration(tb.averageSeconds)}</td><td>{t('nGames', { count: tb.count })}</td></tr>
                                    ))}
                                </tbody>
                            </table>

                            <h3>{t('recentTournaments')}</h3>
                            <table className="duration-table">
                                <tbody>
                                    {breakdown.recentTournaments.map(tr => (
                                        <tr key={tr.id}><th scope="row">{tr.name}<span>{format(tr.date, 'dd.MM.yyyy')}</span></th><td>{formatDuration(tr.averageSeconds)}</td><td>{t('nGames', { count: tr.count })}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            </details>

            <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>

                {/* Duration Override */}
                <div className="form-group">
                    <label htmlFor="matchDurationMin" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                        <Clock size={16} />
                        {t('durationLabel')}
                    </label>
                    <input
                        type="number"
                        id="matchDurationMin"
                        name="matchDurationMin"
                        defaultValue={settings.matchDurationMin}
                        min="5"
                        max="60"
                        className="form-control"
                        style={{ maxWidth: '150px' }}
                    />
                    <small style={{ color: 'var(--color-text-dim)', marginTop: 'var(--spacing-1)', display: 'block' }}>
                        {durationStats.isCalculated ? (
                            t('durationHint', { avg: durationStats.averageMinutes })
                        ) : (
                            t('durationHintDefault')
                        )}
                    </small>
                </div>

                {/* Table Count */}
                <div className="form-group">
                    <label htmlFor="tableCount" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                        <Users size={16} />
                        {t('tableCountLabel')}
                    </label>
                    <input
                        type="number"
                        id="tableCount"
                        name="tableCount"
                        defaultValue={settings.tableCount}
                        min="1"
                        max="10"
                        className="form-control"
                        style={{ maxWidth: '150px' }}
                    />
                    <small style={{ color: 'var(--color-text-dim)', marginTop: 'var(--spacing-1)', display: 'block' }}>
                        {t('tableCountHint')}
                    </small>
                </div>


                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 'var(--spacing-2)', minWidth: '160px' }}>
                    {t('save')}
                </button>
            </form>
        </div>
    );
}
