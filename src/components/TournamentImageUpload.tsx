'use client';

import { useState, useRef } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';

interface Props {
    currentImage?: string | null;
    onUpload: (url: string) => void;
    onRemove?: () => void;
}

export default function TournamentImageUpload({ currentImage, onUpload, onRemove }: Props) {
    const [preview, setPreview] = useState<string | null>(currentImage ?? null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    async function handleFile(file: File) {
        setError('');
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload/tournament', {
            method: 'POST',
            body: formData,
        });
        const json = await res.json();
        setUploading(false);

        if (!res.ok) {
            setError(json.error || 'Upload fehlgeschlagen');
            return;
        }

        setPreview(json.url);
        onUpload(json.url);
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }

    function handleRemove() {
        setPreview(null);
        if (inputRef.current) inputRef.current.value = '';
        onRemove?.();
    }

    return (
        <div>
            {preview ? (
                <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <img
                        src={preview}
                        alt="Turnier Bild"
                        style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        style={{
                            position: 'absolute', top: '8px', right: '8px',
                            background: 'rgba(0,0,0,0.5)', border: 'none',
                            borderRadius: '50%', width: '28px', height: '28px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'white'
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => !uploading && inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    style={{
                        border: '2px dashed var(--color-border-strong)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '32px 16px',
                        textAlign: 'center',
                        cursor: uploading ? 'default' : 'pointer',
                        transition: 'border-color 0.15s',
                        background: 'var(--color-surface)',
                    }}
                >
                    {uploading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--color-text-dim)' }}>
                            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: '0.85rem' }}>Wird hochgeladen...</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <ImagePlus size={28} color="var(--color-text-subtle)" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                Bild hinzufügen
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>
                                JPG, PNG, WebP · max. 5 MB
                            </span>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <p style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: '6px' }}>{error}</p>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleChange}
                style={{ display: 'none' }}
            />

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
