'use client';

import { useState } from 'react';
import { broadcastNotification, NotificationType } from '@/app/actions/notifications';

export default function AdminNotificationsPage() {
    const [status, setStatus] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setStatus('Sending...');
        const title = formData.get('title') as string;
        const message = formData.get('message') as string;
        const link = formData.get('link') as string;
        const type = formData.get('type') as NotificationType;

        const res = await broadcastNotification({
            title,
            message,
            link: link || undefined,
            type
        });

        if (res.success) {
            setStatus(`Success! Sent to ${res.count} users.`);
            (document.getElementById('notify-form') as HTMLFormElement).reset();
        } else {
            setStatus('Error: ' + res.error);
        }
    }

    return (
        <div style={{ padding: 'var(--spacing-8)', maxWidth: '600px', margin: '0 auto' }}>
            <h1 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>Admin benachrichtigen</h1>

            <form id="notify-form" action={handleSubmit} className="glass-panel" style={{ display: 'grid', gap: 'var(--spacing-4)', padding: 'var(--spacing-6)' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Titel</label>
                    <input name="title" required className="input-field" style={{ width: '100%' }} placeholder="z.B. Software Update v2.0" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Nachricht</label>
                    <textarea name="message" required className="input-field" style={{ width: '100%', minHeight: '100px' }} placeholder="Was gibt es neues?" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Link (Optional)</label>
                    <input name="link" className="input-field" style={{ width: '100%' }} placeholder="/tournaments/..." />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Typ</label>
                    <select name="type" className="input-field" style={{ width: '100%' }}>
                        <option value="UPDATE">Software Update</option>
                        <option value="GENERIC">Allgemein</option>
                        <option value="SYSTEM">System</option>
                    </select>
                </div>

                <div style={{ marginTop: 'var(--spacing-4)' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        Broadcast Senden
                    </button>
                </div>

                {status && (
                    <div style={{ marginTop: 'var(--spacing-4)', padding: 'var(--spacing-4)', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)' }}>
                        {status}
                    </div>
                )}
            </form>
        </div>
    );
}
