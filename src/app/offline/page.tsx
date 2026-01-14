'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      gap: 'var(--spacing-6)'
    }}>
      <div className="glass-panel" style={{
        padding: 'var(--spacing-8)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--spacing-6)'
        }}>
          <WifiOff size={40} style={{ color: '#ef4444' }} />
        </div>

        <h1 className="title-display" style={{
          fontSize: '1.5rem',
          marginBottom: 'var(--spacing-4)'
        }}>
          Du bist offline
        </h1>

        <p style={{
          color: 'var(--color-text-dim)',
          marginBottom: 'var(--spacing-6)',
          lineHeight: 1.6
        }}>
          Keine Internetverbindung. Sobald du wieder online bist,
          wird die App automatisch aktualisiert.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-2)'
          }}
        >
          <RefreshCw size={18} />
          Erneut versuchen
        </button>
      </div>

      <p style={{
        fontSize: '0.85rem',
        color: 'var(--color-text-dim)',
        maxWidth: '300px'
      }}>
        Tipp: Bereits besuchte Turniere sind auch offline verfügbar.
      </p>
    </div>
  );
}
