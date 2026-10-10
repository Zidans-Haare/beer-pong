'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Eye, Sparkles } from 'lucide-react';
import { publishWrapped, unpublishWrapped } from '@/app/actions/wrapped';
import { useAppDialog } from '@/components/AppDialog';

interface Scope { id: string; label: string; title: string; from: string; to: string; players: number }
interface Existing { id: string; title: string; range: string; published: boolean; publishedAt: string | null }

export default function WrappedManager({ scopes, existing }: { scopes: Scope[]; existing: Existing[] }) {
    const t = useTranslations('admin.wrapped');
    const appDialog = useAppDialog();
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [scopeId, setScopeId] = useState(scopes[0]?.id ?? '');
    const scope = scopes.find(s => s.id === scopeId) ?? scopes[0];
    const [title, setTitle] = useState(scope?.title ?? '');

    const field: React.CSSProperties = { width: '100%', minHeight: 44, padding: '10px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '1rem' };
    const label: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' };

    const previewUrl = scope ? `/wrapped?from=${encodeURIComponent(scope.from)}&to=${encodeURIComponent(scope.to)}&title=${encodeURIComponent(title)}` : '/wrapped';

    async function publish() {
        if (!scope) return;
        if (!await appDialog.confirm(t('confirmPublish', { title, players: scope.players }), { title: t('publish'), confirmLabel: t('publish') })) return;
        startTransition(async () => {
            const res = await publishWrapped(title, scope.from, scope.to);
            if (res.success) { await appDialog.alert(t('published'), t('publish')); router.refresh(); }
            else appDialog.alert(res.error);
        });
    }

    async function unpublish(item: Existing) {
        if (!await appDialog.confirm(t('confirmUnpublish', { title: item.title }), { title: t('unpublish'), confirmLabel: t('unpublish'), danger: true })) return;
        startTransition(async () => {
            const res = await unpublishWrapped(item.id);
            if (res.success) router.refresh(); else appDialog.alert(res.error);
        });
    }

    return (
        <>
            <section className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'grid', gap: 'var(--spacing-4)', borderTop: '3px solid var(--color-primary)' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{t('newTitle')}</h2>
                <div>
                    <label htmlFor="wrapped-scope" style={label}>{t('scope')}</label>
                    <select id="wrapped-scope" style={field} value={scopeId}
                        onChange={e => { setScopeId(e.target.value); setTitle(scopes.find(s => s.id === e.target.value)?.title ?? title); }}>
                        {scopes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    {scope && <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{t('playersInScope', { count: scope.players })}</p>}
                </div>
                <div>
                    <label htmlFor="wrapped-title" style={label}>{t('name')}</label>
                    <input id="wrapped-title" style={field} value={title} maxLength={60} onChange={e => setTitle(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <a className="btn btn-secondary" href={previewUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Eye size={18} aria-hidden="true" /> {t('preview')}
                    </a>
                    <button type="button" className="btn btn-primary" disabled={pending || !scope || scope.players === 0 || !title.trim()} onClick={publish}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} aria-hidden="true" /> {pending ? t('working') : t('publish')}
                    </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{t('publishHint')}</p>
            </section>

            <section>
                <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--spacing-3)' }}>{t('existing')}</h2>
                {existing.length === 0 ? (
                    <p style={{ color: 'var(--color-text-dim)' }}>{t('none')}</p>
                ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
                        {existing.map(item => (
                            <article key={item.id} className="glass-panel" style={{ padding: 'var(--spacing-4) var(--spacing-5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{item.title}</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                        {item.range} · {item.published ? t('publishedOn', { date: item.publishedAt ?? '' }) : t('withdrawn')}
                                    </p>
                                </div>
                                {item.published && <button type="button" className="btn btn-danger" disabled={pending} onClick={() => unpublish(item)}>{t('unpublish')}</button>}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
