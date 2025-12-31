'use client';

import { createTournament } from '@/app/actions/tournaments';
import { useRouter } from 'next/navigation';
import { Player } from '@prisma/client';
import { useState, useRef } from 'react';

export default function CreateTournamentForm({ players }: { players: Player[] }) {
    const router = useRouter();
    const [createdTournament, setCreatedTournament] = useState<any>(null);
    const [participantEmails, setParticipantEmails] = useState<string[]>([]);
    const formRef = useRef<HTMLFormElement>(null);

    async function clientAction(formData: FormData) {
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
        const bcc = participantEmails.join(',');
        return `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
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
                    <input type="text" name="name" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} placeholder="z.B. Sommerfest 2025" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>Datum & Uhrzeit</label>
                    <input type="datetime-local" name="date" required defaultValue={new Date().toISOString().slice(0, 16)} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>Ort</label>
                    <input type="text" name="location" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} placeholder="z.B. Nicks Keller" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>Modus</label>
                    <select name="type" style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }}>
                        <option value="ELIMINATION">K.O. System</option>
                        <option value="ROUND_ROBIN">Jeder gegen Jeden + Finale</option>
                    </select>
                </div>

                <hr style={{ borderColor: 'var(--color-border)', margin: 'var(--spacing-2) 0' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                    <input type="checkbox" id="startImmediately" name="startImmediately" style={{ width: '20px', height: '20px' }} />
                    <label htmlFor="startImmediately" style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-primary)' }}>Sofort starten (Direkte Teilnehmerwahl)</label>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>Teilnehmer auswählen (Mehrfachauswahl möglich)</label>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'var(--color-bg)', padding: 'var(--spacing-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                        {players.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: '4px' }}>
                                <input type="checkbox" name="participants" value={p.id} id={`p-${p.id}`} />
                                <label htmlFor={`p-${p.id}`} style={{ cursor: 'pointer', color: 'var(--color-text)' }}>{p.name}</label>
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>Wird für Einladungen oder "Sofort start" verwendet.</p>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--spacing-4)' }}>
                    Turnier Erstellen
                </button>
            </form>
        </div>
    );
}
