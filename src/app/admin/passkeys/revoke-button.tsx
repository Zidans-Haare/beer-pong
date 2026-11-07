'use client';

import { useState } from 'react';
import { ShieldOff } from 'lucide-react';
import { revokePasskey } from '@/app/actions/admin';
import { useTranslations } from 'next-intl';
import { useAppDialog } from '@/components/AppDialog';

export default function RevokeButton({ passkeyId, userName }: { passkeyId: string; userName: string }) {
    const appDialog = useAppDialog();
    const t = useTranslations('admin.passkeys');
    const [loading, setLoading] = useState(false);

    async function handleRevoke() {
        if (!await appDialog.confirm(t('confirmRevoke', { name: userName }))) return;
        setLoading(true);
        const res = await revokePasskey(passkeyId);
        if (!res.success) {
            appDialog.alert(res.error ?? t('revokeError'));
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleRevoke}
            disabled={loading}
            title={t('revokeTitle')}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-error)',
                opacity: loading ? 0.4 : 0.7,
                padding: '4px',
                display: 'flex',
                flexShrink: 0,
                transition: 'opacity 0.2s',
            }}
        >
            <ShieldOff size={16} />
        </button>
    );
}
