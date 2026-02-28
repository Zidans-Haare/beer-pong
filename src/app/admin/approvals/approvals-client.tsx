'use client';

import { useTransition } from 'react';
import { approveUser, rejectUser } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

export default function ApprovalsClient({ userId }: { userId: string }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    function handleApprove() {
        startTransition(async () => {
            await approveUser(userId);
            router.refresh();
        });
    }

    function handleReject() {
        startTransition(async () => {
            await rejectUser(userId);
            router.refresh();
        });
    }

    return (
        <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexShrink: 0 }}>
            <button
                onClick={handleApprove}
                disabled={isPending}
                className="btn"
                style={{
                    background: 'var(--color-success, #22c55e)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                }}
            >
                Freigeben
            </button>
            <button
                onClick={handleReject}
                disabled={isPending}
                className="btn"
                style={{
                    background: 'var(--color-error, #ef4444)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                }}
            >
                Ablehnen
            </button>
        </div>
    );
}
