import { and, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/server/db/client';
import { payments } from '@/server/db/schema';
import { syncMercadoPagoPayment } from '@/server/services/billing.service';

export const runtime = 'nodejs';

/** Consulta do Pix pela tela de pagamento. Reconcilia com o Mercado Pago se o webhook ainda não chegou. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Não autorizado', { status: 401 });
  const { id } = await ctx.params;

  const find = () =>
    getDb()
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.userId, user.id)))
      .limit(1);

  let [row] = await find();
  if (!row) return new Response('Não encontrado', { status: 404 });

  if (row.status === 'pending' && row.provider === 'mercadopago') {
    try {
      await syncMercadoPagoPayment(row.providerPaymentId);
      [row] = await find();
    } catch (e) {
      console.error('[payments status]', e);
    }
  }
  return Response.json({ status: row.status, planId: row.planId });
}
