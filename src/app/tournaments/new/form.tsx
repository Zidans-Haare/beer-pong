'use client';

import { createTournament } from '@/app/actions/tournaments';
import { useRouter } from 'next/navigation';
import { Player } from '@prisma/client';
import { useState, useRef } from 'react';

export default function CreateTournamentForm({ players }: { players: Player[] }) {
    const router = useRouter();
    const [createdTournament, setCreatedTournament] = useState<any>(null);
    const [participantEmails, setParticipantEmails] = useState<string[]>([]);
    const [startImmediately, setStartImmediately] = useState(true);
    const formRef = useRef<HTMLFormElement>(null);

    async function clientAction(formData: FormData) {
        // Add startImmediately to formData as it might be useful or just rely on state if we were using it differently
        // But here we use a checkbox in the form which is better for traditional formData
        const res = await createTournament(formData);
        if (res.success && res.redirectUrl) {
            router.push(res.redirectUrl);
        } else if (res.success && res.tournament) {
            // Show success dialog for planned tournament
            setCreatedTournament(res.tournament);
            setParticipantEmails(res.participantEmails || []);
        } else {
            alert('Fehler: ' + res.error);
        }
    }

    // Generate Mailto Link
    const mailtoLink = (() => {
        if (!createdTournament) return '#';
        const subject = encodeURIComponent(`Bierpong Turnier: ${createdTournament.name}`);
        const body = encodeURIComponent(`Hallo Leute,\n\nes steht ein neues Bierpong-Turnier an!\n\n📅 Wann: ${new Date(createdTournament.date).toLocaleString()}\n📍 Wo: ${createdTournament.location}\n🏆 Modus: ${createdTournament.type}\n\nBitte gebt Bescheid ob ihr dabei seid!\n\nViele Grüße,\nDer Host`);
        const recipients = participantEmails.join(',');
        return `mailto:${recipients}?subject=${subject}&body=${body}`;
    })();

    // Generate ICS Download
    const downloadICS = async () => {
        if (!createdTournament) return;
        const { generateICS } = await import('@/lib/ics');
        const icsContent = generateICS({
            title: `🏆 ${createdTournament.name}`,
            description: `Bierpong Turnier (${createdTournament.type})`,
            location: createdTournament.location,
            start: new Date(createdTournament.date),
            durationMinutes: 180 // Default 3 hours
        });

        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tournament.ics';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (createdTournament) {
        return (
            <div className="glass-panel" style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>Turnier erfolgreich erstellt! 🎉</h2>
                <p style={{ marginBottom: 'var(--spacing-6)', color: 'var(--color-text-dim)' }}>
                    Das Turnier "{createdTournament.name}" wurde angelegt. <br />
                    Jetzt Teilnehmer einladen?
                </p>

                <div style={{ display: 'grid', gap: 'var(--spacing-4)', maxWidth: '400px', margin: '0 auto' }}>
                    <a href={mailtoLink} target="_blank" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-2)', textDecoration: 'none' }}>
                        📧 Email an alle ({participantEmails.length})
                    </a>

                    <button onClick={downloadICS} className="btn" style={{ border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-2)' }}>
                        📅 Kalendereintrag (.ics)
                    </button>

                    <button
                        onClick={async () => {
                            if (!confirm('Benachrichtigung jetzt an alle App-Nutzer senden?')) return;
                            const title = 'Turnier Einladung';
                            const message = `Komm zum Turnier "${createdTournament.name}" am ${new Date(createdTournament.date).toLocaleDateString()}!`;
                            const { broadcastNotification } = await import('@/app/actions/notifications');
                            await broadcastNotification({
                                title,
                                message,
                                type: 'TOURNAMENT',
                                link: `/tournaments/${createdTournament.id}`
                            });
                            alert('📢 Benachrichtigung gesendet!');
                        }}
                        className="btn"
                        style={{ border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-2)', color: 'var(--color-primary)' }}
                    >
                        📢 App-Benachrichtigung (Manuell)
                    </button>

                    <button onClick={() => router.push('/tournaments')} className="btn" style={{ marginTop: 'var(--spacing-2)' }}>
                        Zum Turnier Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', maxWidth: '600px', margin: '0 auto' }}>
            <form ref={formRef} action={clientAction} style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>Name des Turniers</label>
                    <input type="text" name="name" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} placeholder="z.B. Montags-Pong" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>Ort</label>
                    <input type="text" name="location" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} placeholder="z.B. Nicks Keller" />
                </div>

                <div className="glass-panel" style={{ padding: 'var(--spacing-4)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-3)', fontWeight: 'bold', color: 'var(--color-primary)' }}>Wann geht es los?</label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginBottom: startImmediately ? '0' : 'var(--spacing-4)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="startImmediately"
                                value="on"
                                checked={startImmediately}
                                onChange={() => setStartImmediately(true)}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span>Jetzt (Lobby öffnen)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="startImmediately"
                                value="off"
                                checked={!startImmediately}
                                onChange={() => setStartImmediately(false)}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span>Später planen</span>
                        </label>
                    </div>

                    {!startImmediately && (
                        <input
                            type="datetime-local"
                            name="date"
                            required={!startImmediately}
                            defaultValue={new Date().toISOString().slice(0, 16)}
                            style={{ width: '96%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }}
                        />
                    )}
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>Modus</label>
                    <select name="type" id="type" className="input-field" style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }}>
                        <option value="SINGLE_ELIMINATION">K.O. System</option>
                        <option value="ROUND_ROBIN">Jeder gegen Jeden (Liga)</option>
                        <option value="GROUPS">Gruppenphase + K.O.</option>
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
                    <input type="checkbox" id="hasReturnLeg" name="hasReturnLeg" style={{ width: '20px', height: '20px' }} />
                    <label htmlFor="hasReturnLeg" style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-secondary)' }}>Rückrunde spielen? (Hin- & Rückspiel)</label>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--spacing-4)', padding: 'var(--spacing-4)', fontSize: '1.1rem' }}>
                    {startImmediately ? '🚀 Turnier-Lobby öffnen' : '📅 Turnier planen'}
                </button>
            </form>
        </div>
    );
}
