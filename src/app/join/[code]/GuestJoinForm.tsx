'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGuestPlayer } from '@/app/actions/guests';
import { haptic } from '@/lib/haptics';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  tournamentId: string;
}

export default function GuestJoinForm({ tournamentId }: Props) {
  const router = useRouter();
  const t = useTranslations('join');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError(t('nameError'));
      haptic.error();
      return;
    }

    setLoading(true);
    haptic.light();

    try {
      const result = await createGuestPlayer(name.trim(), tournamentId);

      if (result.success) {
        haptic.success();
        router.push(`/tournaments/${tournamentId}`);
        router.refresh();
      } else {
        setError(result.error || t('joinError'));
        haptic.error();
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
      <label
        htmlFor="guestName"
        style={{
          display: 'block',
          marginBottom: 'var(--spacing-2)',
          fontWeight: 'bold',
          color: 'var(--color-text)'
        }}
      >
        {t('yourName')}
      </label>
      <input
        id="guestName"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('namePlaceholder')}
        maxLength={30}
        autoFocus
        autoComplete="name"
        style={{
          width: '100%',
          padding: 'var(--spacing-4)',
          background: 'var(--color-surface)',
          border: error ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
          color: 'var(--color-text)',
          borderRadius: 'var(--radius-md)',
          fontSize: '1.1rem',
          marginBottom: 'var(--spacing-2)'
        }}
      />

      {error && (
        <p style={{
          color: 'var(--color-primary)',
          fontSize: '0.85rem',
          marginBottom: 'var(--spacing-3)'
        }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || name.trim().length < 2}
        className="btn btn-primary"
        style={{
          width: '100%',
          padding: 'var(--spacing-4)',
          fontSize: '1.1rem',
          marginTop: 'var(--spacing-2)',
          opacity: loading || name.trim().length < 2 ? 0.6 : 1,
          cursor: loading || name.trim().length < 2 ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Moment...' : <><UserPlus size={20} style={{ marginRight: '8px' }} /> Mitmachen!</>}
      </button>

      <p style={{
        fontSize: '0.75rem',
        color: 'var(--color-text-dim)',
        textAlign: 'center',
        marginTop: 'var(--spacing-3)'
      }}>
        Dein Gast-Zugang ist 24 Stunden gültig
      </p>
    </form>
  );
}
