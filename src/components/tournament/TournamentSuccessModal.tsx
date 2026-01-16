'use client';

import { X, Mail, Megaphone, CalendarPlus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Participant = {
    email: string | null;
    name: string;
};

type TournamentSuccessModalProps = {
    tournament: {
        id: string;
        name: string;
        date: Date;
        location: string | null;
        type: string;
    };
    participants: Participant[];
};

export default function TournamentSuccessModal({ tournament, participants }: TournamentSuccessModalProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(searchParams.get('newlyCreated') === 'true');

    if (!isOpen) return null;

    const participantEmails = participants
        .map(p => p.email)
        .filter((email): email is string => !!email);

    // Generate Mailto Link
    const mailtoLink = (() => {
        const subject = encodeURIComponent(`Bierpong Turnier: ${tournament.name}`);
        const body = encodeURIComponent(`Hallo Leute,\n\nes steht ein neues Bierpong-Turnier an!\n\nWann: ${new Date(tournament.date).toLocaleString()}\nWo: ${tournament.location || 'TBA'}\nModus: ${tournament.type}\n\nBitte gebt Bescheid ob ihr dabei seid!\n\nViele Grüße,\nDer Host`);
        const recipients = participantEmails.join(',');
        return `mailto:${recipients}?subject=${subject}&body=${body}`;
    })();

    // Generate ICS Download
    const downloadICS = async () => {
        const { generateICS } = await import('@/lib/ics');
        const icsContent = generateICS({
            title: tournament.name,
            description: `Bierpong Turnier (${tournament.type})`,
            location: tournament.location || '',
            start: new Date(tournament.date),
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

    const handleClose = () => {
        setIsOpen(false);
        // Remove query param without full reload
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('newlyCreated');
        router.replace(`/tournaments/${tournament.id}?${newParams.toString()}`);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-4)',
            backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{
                maxWidth: '450px',
                width: '100%',
                padding: 'var(--spacing-6)',
                position: 'relative',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute',
                        top: 'var(--spacing-4)',
                        right: 'var(--spacing-4)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-dim)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)', textAlign: 'center' }}>Turnier erfolgreich erstellt!</h2>

                <p style={{ marginBottom: 'var(--spacing-6)', color: 'var(--color-text-dim)', textAlign: 'center' }}>
                    "{tournament.name}" ist bereit. <br />
                    Lade jetzt deine Freunde ein!
                </p>

                <div style={{ padding: 'var(--spacing-4)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: 'var(--spacing-4)' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-3)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Teilnehmer informieren</h3>
                    <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
                        <a href={mailtoLink} target="_blank" className="btn" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-2)', textDecoration: 'none',
                            background: 'rgba(52, 152, 219, 0.15)', color: '#3498db', border: '1px solid rgba(52, 152, 219, 0.3)'
                        }}>
                            <Mail size={18} /> Email senden ({participantEmails.length})
                        </a>

                        <button
                            onClick={async () => {
                                if (!confirm('Benachrichtigung jetzt an alle App-Nutzer senden?')) return;
                                const title = 'Turnier Einladung';
                                const message = `Komm zum Turnier "${tournament.name}" am ${new Date(tournament.date).toLocaleDateString()}!`;
                                const { broadcastNotification } = await import('@/app/actions/notifications');
                                await broadcastNotification({
                                    title,
                                    message,
                                    type: 'TOURNAMENT',
                                    link: `/tournaments/${tournament.id}`
                                });
                                alert('Benachrichtigung gesendet!');
                            }}
                            className="btn"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-2)',
                                background: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c', border: '1px solid rgba(231, 76, 60, 0.3)'
                            }}
                        >
                            <Megaphone size={18} /> App-Push senden
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
                    <button onClick={downloadICS} className="btn" style={{ border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-2)' }}>
                        <CalendarPlus size={18} /> Kalendereintrag (.ics)
                    </button>

                    <button onClick={handleClose} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        Zum Turnier Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
