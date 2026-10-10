"use client";

import * as Sentry from "@sentry/nextjs";
import { ArrowLeft, RefreshCw, TriangleAlert } from 'lucide-react';
import { useEffect } from "react";
import Link from 'next/link';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const german = process.env.NEXT_PUBLIC_LOCALE === 'de';
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang={german ? 'de' : 'en'}>
      <body>
        <main className="container auth-page error-page">
          <div className="eyebrow">Bier Pong</div>
          <TriangleAlert size={40} strokeWidth={1.5} style={{ color: 'var(--color-secondary)', margin: '24px 0' }} />
          <h1>{german ? 'Etwas ist schiefgelaufen' : 'Something went wrong'}</h1>
          <div className="form-stack" style={{ marginTop: '24px' }}>
            <button type="button" onClick={reset} className="btn btn-primary"><RefreshCw size={18} />{german ? 'Erneut versuchen' : 'Try again'}</button>
            <Link href="/" className="btn btn-secondary"><ArrowLeft size={18} />{german ? 'Zur Startseite' : 'Back to home'}</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
