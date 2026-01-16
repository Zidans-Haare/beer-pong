'use client';

import { useState } from 'react';
import { Fingerprint, Trash2, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import PasskeyRegisterButton from '@/components/PasskeyRegisterButton';
import { haptic } from '@/lib/haptics';
import { useRouter } from 'next/navigation';

interface Passkey {
  id: string;
  friendlyName: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

interface PasskeySettingsProps {
  passkeys: Passkey[];
}

export default function PasskeySettings({ passkeys }: PasskeySettingsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (passkeyId: string) => {
    if (!confirm('Passkey wirklich löschen?')) return;

    setIsDeleting(passkeyId);
    try {
      const res = await fetch(`/api/auth/passkey/${passkeyId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        haptic.success();
        router.refresh();
      } else {
        haptic.error();
        alert('Löschen fehlgeschlagen');
      }
    } catch (error) {
      haptic.error();
      alert('Fehler beim Löschen');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: 'var(--spacing-4)',
        }}
      >
        <Fingerprint size={24} style={{ color: 'var(--color-primary)' }} />
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: '4px' }}>
            Face ID / Touch ID
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
            Melde dich schneller an mit biometrischer Authentifizierung
          </p>
        </div>
      </div>

      {/* Existing Passkeys */}
      {passkeys.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--spacing-3)',
                background: 'var(--color-surface-hover)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Smartphone size={20} style={{ color: 'var(--color-text-dim)' }} />
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {passkey.friendlyName || 'Passkey'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                    Erstellt: {format(new Date(passkey.createdAt), 'dd.MM.yyyy', { locale: de })}
                    {passkey.lastUsedAt && (
                      <> • Zuletzt: {format(new Date(passkey.lastUsedAt), 'dd.MM.yyyy', { locale: de })}</>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(passkey.id)}
                disabled={isDeleting === passkey.id}
                style={{
                  padding: '8px',
                  color: 'var(--color-error)',
                  opacity: isDeleting === passkey.id ? 0.5 : 1,
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Register New Passkey */}
      <PasskeyRegisterButton onSuccess={() => router.refresh()} />

      {passkeys.length === 0 && (
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--color-text-dim)',
            marginTop: 'var(--spacing-3)',
            textAlign: 'center',
          }}
        >
          Du hast noch keinen Passkey eingerichtet.
        </p>
      )}
    </div>
  );
}
