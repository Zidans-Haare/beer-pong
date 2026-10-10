'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useAppDialog } from '@/components/AppDialog';

export default function AdminDeleteButton({ id, type, deleteAction }: { id: string, type: 'Player' | 'Tournament', deleteAction: (id: string) => Promise<{ success: boolean, error?: string }> }) {
    const appDialog = useAppDialog();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleDelete() {
        if (!await appDialog.confirm(`Möchtest du dieses ${type} wirklich löschen?`)) return;

        setIsDeleting(true);
        const result = await deleteAction(id);
        setIsDeleting(false);

        if (result.success) {
            if (type === 'Player') router.push('/players');
            if (type === 'Tournament') router.push('/tournaments');
            router.refresh();
        } else {
            appDialog.alert(result.error || 'Fehler beim Löschen');
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-error)',
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'opacity 0.2s',
                padding: 'var(--spacing-2)'
            }}
            title={`${type} Löschen`}
        >
            <Trash2 size={20} />
        </button>
    );
}
