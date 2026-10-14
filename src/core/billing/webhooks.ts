import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SubscriptionStatus } from './access';

/**
 * Valida a assinatura (x-signature) das notificações do Mercado Pago.
 * Manifesto: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` (partes ausentes são omitidas).
 */
export function verifyMercadoPagoSignature(p: {
  secret: string;
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
}): boolean {
  if (!p.signatureHeader || !p.dataId || !p.secret) return false;
  const parts: Record<string, string> = {};
  for (const chunk of p.signatureHeader.split(',')) {
    const [k, ...v] = chunk.trim().split('=');
    if (k) parts[k] = v.join('=');
  }
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  const id = /^[a-z0-9]+$/i.test(p.dataId) ? p.dataId.toLowerCase() : p.dataId;
  let manifest = `id:${id};`;
  if (p.requestId) manifest += `request-id:${p.requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac('sha256', p.secret).update(manifest).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due';
    default:
      return 'canceled'; // canceled, incomplete_expired, paused
  }
}

/** Formata uma data no padrão exigido pelo Mercado Pago (offset -03:00, sem horário de verão desde 2019). */
export function toBrazilOffsetISO(date: Date): string {
  return new Date(date.getTime() - 3 * 3_600_000).toISOString().replace('Z', '-03:00');
}
