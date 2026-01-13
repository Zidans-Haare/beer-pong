'use client';

import { submitRSVP } from '@/app/actions/rsvp';
import { Player } from '@prisma/client';
import { useState } from 'react';

export default function RSVPForm({
    tournamentId,
    currentStatus,
    title = "Bist du dabei?"
}: {
    tournamentId: string;
    currentStatus?: string;
    title?: string;
}) {
    async function action(formData: FormData) {
        const res = await submitRSVP(formData);
        if (!res.success) {
            alert(res.error);
        }
    }

    const [rulesAccepted, setRulesAccepted] = useState(false);

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-primary)' }}>{title}</h3>
            <form action={action} style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
                <input type="hidden" name="tournamentId" value={tournamentId} />

                <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                    <button
                        type="submit"
                        name="status"
                        value="YES"
                        className="btn"
                        disabled={!rulesAccepted && currentStatus !== 'YES'} // Enforce rules only if not already joined
                        style={{
                            flex: '1 1 100px',
                            background: currentStatus === 'YES' ? '#00ff9d' : (rulesAccepted ? 'rgba(0, 255, 157, 0.1)' : 'rgba(255, 255, 255, 0.05)'),
                            color: currentStatus === 'YES' ? 'black' : (rulesAccepted ? '#00ff9d' : 'var(--color-text-dim)'),
                            border: `1px solid ${currentStatus === 'YES' || rulesAccepted ? '#00ff9d' : 'var(--color-border)'}`,
                            padding: 'var(--spacing-3) var(--spacing-2)',
                            fontSize: '0.9rem',
                            opacity: (!rulesAccepted && currentStatus !== 'YES') ? 0.5 : 1,
                            cursor: (!rulesAccepted && currentStatus !== 'YES') ? 'not-allowed' : 'pointer'
                        }}>
                        {currentStatus === 'YES' ? '✓ Dabei' : 'Dabei'}
                    </button>

                    <button type="submit" name="status" value="MAYBE" className="btn"
                        style={{
                            flex: '1 1 100px',
                            background: currentStatus === 'MAYBE' ? 'orange' : 'rgba(255, 165, 0, 0.1)',
                            color: currentStatus === 'MAYBE' ? 'black' : 'orange',
                            border: '1px solid orange',
                            padding: 'var(--spacing-3) var(--spacing-2)',
                            fontSize: '0.9rem'
                        }}>
                        Vielleicht
                    </button>

                    <button type="submit" name="status" value="NO" className="btn"
                        style={{
                            flex: '1 1 100px',
                            background: currentStatus === 'NO' ? '#ff0055' : 'rgba(255, 0, 85, 0.1)',
                            color: currentStatus === 'NO' ? 'white' : '#ff0055',
                            border: '1px solid #ff0055',
                            padding: 'var(--spacing-3) var(--spacing-2)',
                            fontSize: '0.9rem'
                        }}>
                        Absage
                    </button>
                </div>

                {currentStatus !== 'YES' && (
                    <div style={{ marginTop: 'var(--spacing-2)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={rulesAccepted}
                                onChange={(e) => setRulesAccepted(e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                Ich akzeptiere die <a href="/rules" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Regeln</a>
                            </span>
                        </label>
                    </div>
                )}
            </form>
        </div>
    );
}
