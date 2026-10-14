import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@/lib/sentry-scrub';

/** Monitoramento de erros do servidor. Só liga se SENTRY_DSN estiver definido. */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend: (event) => scrubEvent(event),
  });
}

export const onRequestError = Sentry.captureRequestError;
