'use client';

import { useState } from 'react';
import TournamentImageUpload from '@/components/TournamentImageUpload';
import { updateTournamentImage } from '@/app/actions/tournaments';
import { Camera } from 'lucide-react';

interface Props {
    tournamentId: string;
    currentImage?: string | null;
    isHost: boolean;
}

export default function TournamentImageEditor({ tournamentId, currentImage, isHost }: Props) {
    const [image, setImage] = useState<string | null>(currentImage ?? null);
    const [showEditor, setShowEditor] = useState(false);
    const [saving, setSaving] = useState(false);

    async function handleUpload(url: string) {
        setSaving(true);
        setImage(url);
        await updateTournamentImage(tournamentId, url);
        setSaving(false);
        setShowEditor(false);
    }

    async function handleRemove() {
        setSaving(true);
        setImage(null);
        await updateTournamentImage(tournamentId, '');
        setSaving(false);
    }

    if (!image && !isHost) return null;

    return (
        <div style={{ marginBottom: 'var(--spacing-4)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}>
            {image ? (
                <>
                    <img
                        src={image}
                        alt="Turnier Bild"
                        style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                    />
                    {isHost && (
                        <button
                            onClick={() => setShowEditor(v => !v)}
                            style={{
                                position: 'absolute', bottom: '10px', right: '10px',
                                background: 'rgba(0,0,0,0.55)', border: 'none',
                                borderRadius: 'var(--radius-md)', padding: '6px 12px',
                                color: 'white', fontSize: '0.8rem', fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <Camera size={14} /> Bild ändern
                        </button>
                    )}
                </>
            ) : null}

            {isHost && (!image || showEditor) && (
                <div style={{ marginTop: image ? 'var(--spacing-3)' : 0 }}>
                    <TournamentImageUpload
                        currentImage={showEditor ? null : undefined}
                        onUpload={handleUpload}
                        onRemove={image ? handleRemove : undefined}
                    />
                    {saving && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '6px' }}>Wird gespeichert...</p>}
                </div>
            )}
        </div>
    );
}
