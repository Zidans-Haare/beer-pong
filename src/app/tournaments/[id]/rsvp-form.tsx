'use client';

import { submitRSVP } from '@/app/actions/rsvp';
import { Player } from '@prisma/client';

export default function RSVPForm({
    tournamentId,
    currentStatus
}: {
    tournamentId: string;
    currentStatus?: string;
}) {
    async function action(formData: FormData) {
        const res = await submitRSVP(formData);
        if (!res.success) {
            alert(res.error);
        }
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-4)' }}>Bist du dabei?</h3>
            <form action={action} style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
                <input type="hidden" name="tournamentId" value={tournamentId} />

                <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                    <button type="submit" name="status" value="YES" className="btn"
                        style={{
                            flex: 1,
                            background: currentStatus === 'YES' ? '#00ff9d' : 'rgba(0, 255, 157, 0.1)',
                            color: currentStatus === 'YES' ? 'black' : '#00ff9d',
                            border: '1px solid #00ff9d'
                        }}>
                        {currentStatus === 'YES' ? '✓ Dabei' : 'Dabei'}
                    </button>

                    <button type="submit" name="status" value="MAYBE" className="btn"
                        style={{
                            flex: 1,
                            background: currentStatus === 'MAYBE' ? 'orange' : 'rgba(255, 165, 0, 0.1)',
                            color: currentStatus === 'MAYBE' ? 'black' : 'orange',
                            border: '1px solid orange'
                        }}>
                        Vielleicht
                    </button>

                    <button type="submit" name="status" value="NO" className="btn"
                        style={{
                            flex: 1,
                            background: currentStatus === 'NO' ? '#ff0055' : 'rgba(255, 0, 85, 0.1)',
                            color: currentStatus === 'NO' ? 'white' : '#ff0055',
                            border: '1px solid #ff0055'
                        }}>
                        Absage
                    </button>
                </div>
            </form>
        </div>
    );
}
