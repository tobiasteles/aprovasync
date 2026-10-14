'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#faf8f3', color: '#12203f', display: 'grid', placeItems: 'center', minHeight: '100dvh', margin: 0 }}>
        <div style={{ maxWidth: 420, textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Algo não saiu como esperado</h1>
          <p style={{ color: '#4a5776' }}>Já fomos avisados. Seus dados estão seguros: tente de novo.</p>
          <button onClick={reset} style={{ background: '#2347c9', color: '#fff', border: 0, borderRadius: 12, padding: '12px 24px', fontWeight: 700, cursor: 'pointer' }}>
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
