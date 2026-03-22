import { getSystemSettings, updateSystemSettings } from '@/app/actions/admin';
import { getGlobalDurationStats } from '@/lib/duration';
import { Clock, Users, BarChart3, AlertCircle, CheckCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function AdminSettingsPage() {
    const [settings, durationStats, t] = await Promise.all([getSystemSettings(), getGlobalDurationStats(), getTranslations('admin.settings')]);

    async function handleSubmit(formData: FormData) {
        'use server';
        await updateSystemSettings(formData);
    }

    return (
        <div className="card" style={{ maxWidth: '600px' }}>
            <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>{t('title')}</h2>

            {/* Smart Duration Info Box */}
            <div style={{
                padding: 'var(--spacing-4)',
                background: durationStats.isCalculated
                    ? 'linear-gradient(135deg, rgba(78, 205, 196, 0.1) 0%, rgba(78, 205, 196, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 165, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%)',
                border: `1px solid ${durationStats.isCalculated ? 'var(--color-secondary)' : 'orange'}`,
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-6)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-3)' }}>
                    <BarChart3 size={18} color={durationStats.isCalculated ? 'var(--color-secondary)' : 'orange'} />
                    <span style={{ fontWeight: 600 }}>{t('smartDuration')}</span>
                    {durationStats.isCalculated ? (
                        <CheckCircle size={14} color="var(--color-secondary)" />
                    ) : (
                        <AlertCircle size={14} color="orange" />
                    )}
                </div>

                {durationStats.isCalculated ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-secondary)' }}>
                                {durationStats.averageMinutes}
                            </span>
                            <span style={{ color: 'var(--color-text-dim)' }}>{t('avgMin')}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', margin: 0 }}>
                            {t('basedOn', { count: durationStats.matchCount })}
                        </p>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'orange' }}>
                                {durationStats.averageMinutes}
                            </span>
                            <span style={{ color: 'var(--color-text-dim)' }}>{t('defaultMin')}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', margin: 0 }}>
                            {t('notEnoughData', { count: durationStats.matchCount })}
                        </p>
                    </>
                )}
            </div>

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

                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: 'var(--spacing-2)' }}>
                    {t('save')}
                </button>
            </form>
        </div>
    );
}
