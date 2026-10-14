import 'server-only';
import { PRICING, toBrazilOffsetISO } from '@/core/billing';
import { appUrl, env } from '@/lib/env';

const API = 'https://api.mercadopago.com';

export interface PixPayment {
  id: string;
  status: string;
  qrCode: string;
  qrBase64: string;
  expiresAt: Date;
}

export async function createPixPayment(p: {
  amountCents: number;
  description: string;
  email: string;
  externalReference: string;
  idempotencyKey: string;
}): Promise<PixPayment> {
  const expiresAt = new Date(Date.now() + PRICING.pixExpiresMinutes * 60_000);
  const base = appUrl();
  // O Mercado Pago rejeita notification_url que não seja pública (ex.: localhost).
  const notificationUrl = base.startsWith('https://') ? `${base}/api/webhooks/mercadopago` : undefined;

  const res = await fetch(`${API}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('MERCADOPAGO_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': p.idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: p.amountCents / 100,
      description: p.description,
      payment_method_id: 'pix',
      payer: { email: p.email },
      external_reference: p.externalReference,
      date_of_expiration: toBrazilOffsetISO(expiresAt),
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const tx = data?.point_of_interaction?.transaction_data;
  if (!tx?.qr_code) throw new Error('Mercado Pago não retornou o QR Code do Pix.');
  return {
    id: String(data.id),
    status: String(data.status),
    qrCode: String(tx.qr_code),
    qrBase64: String(tx.qr_code_base64 ?? ''),
    expiresAt,
  };
}

export async function fetchPayment(id: string): Promise<{ id: string; status: string; externalReference: string | null }> {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${env('MERCADOPAGO_ACCESS_TOKEN')}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { id: String(data.id), status: String(data.status), externalReference: data.external_reference ?? null };
}
