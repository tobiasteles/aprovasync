import { verifyMercadoPagoSignature } from '@/core/billing';
import { syncMercadoPagoPayment } from '@/server/services/billing.service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => null)) as { type?: string; action?: string; data?: { id?: string | number } } | null;
  const dataId = url.searchParams.get('data.id') ?? (body?.data?.id != null ? String(body.data.id) : null);

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const valid = verifyMercadoPagoSignature({
      secret,
      signatureHeader: req.headers.get('x-signature'),
      requestId: req.headers.get('x-request-id'),
      dataId: url.searchParams.get('data.id') ?? dataId,
    });
    if (!valid) return new Response('Assinatura inválida', { status: 401 });
  } else if (process.env.NODE_ENV === 'production') {
    return new Response('MERCADOPAGO_WEBHOOK_SECRET não configurado', { status: 500 });
  }

  const isPayment = (body?.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic')) === 'payment';
  if (isPayment && dataId) {
    try {
      await syncMercadoPagoPayment(dataId);
    } catch (e) {
      console.error('[webhook mercadopago]', e);
      return new Response('Erro ao processar', { status: 500 }); // MP reenvia
    }
  }
  return Response.json({ received: true });
}
