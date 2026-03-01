'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteChatMessage } from '@/app/actions/chat';

export default function ChatDeleteButton({ messageId }: { messageId: string }) {
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleDelete() {
        if (!confirm('Nachricht wirklich löschen?')) return;
        setIsDeleting(true);
        const result = await deleteChatMessage(messageId);
        if (!result.success) {
            alert(result.error ?? 'Fehler beim Löschen.');
            setIsDeleting(false);
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            title="Nachricht löschen"
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-error)',
                opacity: isDeleting ? 0.4 : 0.7,
                padding: '4px',
                display: 'flex',
                flexShrink: 0,
                transition: 'opacity 0.2s',
            }}
        >
            <Trash2 size={16} />
        </button>
    );
}
