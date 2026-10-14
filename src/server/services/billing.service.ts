import 'server-only';
import { and, eq, ne } from 'drizzle-orm';
import type Stripe from 'stripe';
import { licenseExpiry, mapStripeSubscriptionStatus } from '@/core/billing';
import { getDb } from '../db/client';
import { payments, planLicenses, studyPlans, subscriptions, users } from '../db/schema';
import { fetchPayment } from '../billing/mercadopago';

/** Concede/renova o Passe do Edital de um plano. Idempotente (upsert por plano). */
async function grantPassLicense(p: { userId: string; planId: string; paymentId: string }) {
  const db = getDb();
  const [plan] = await db.select({ examDate: studyPlans.examDate }).from(studyPlans).where(eq(studyPlans.id, p.planId)).limit(1);
  if (!plan) return;
  const expiresAt = licenseExpiry(plan.examDate, new Date());
  await db
    .insert(planLicenses)
    .values({ userId: p.userId, planId: p.planId, paymentId: p.paymentId, expiresAt })
    .onConflictDoUpdate({ target: planLicenses.planId, set: { expiresAt, paymentId: p.paymentId } });
}

/** Cartão (Stripe Checkout, modo pagamento único). Chamado pelo webhook; seguro contra reentrega. */
export async function recordStripePassPayment(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  if (!userId || !planId || session.payment_status !== 'paid') return;

  const [row] = await getDb()
    .insert(payments)
    .values({
      userId,
      planId,
      provider: 'stripe',
      providerPaymentId: session.id,
      amountCents: session.amount_total ?? 0,
      status: 'approved',
      paidAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: payments.id });

  if (row) await grantPassLicense({ userId, planId, paymentId: row.id });
}

/** Pix (Mercado Pago). Sempre reconsulta a API: nunca confia só no corpo do webhook. */
export async function syncMercadoPagoPayment(mpPaymentId: string) {
  const db = getDb();
  const remote = await fetchPayment(mpPaymentId);

  const [row] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.provider, 'mercadopago'), eq(payments.providerPaymentId, remote.id)))
    .limit(1);
  if (!row) return;

  if (remote.status === 'approved') {
    const [updated] = await db
      .update(payments)
      .set({ status: 'approved', paidAt: new Date() })
      .where(and(eq(payments.id, row.id), ne(payments.status, 'approved')))
      .returning({ id: payments.id });
    if (updated && row.planId) await grantPassLicense({ userId: row.userId, planId: row.planId, paymentId: row.id });
  } else if (['rejected', 'cancelled', 'expired'].includes(remote.status) && row.status === 'pending') {
    await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, row.id));
  }
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  // Em versões novas da API, o período fica nos itens da assinatura.
  const s = sub as unknown as { current_period_end?: number; items?: { data?: { current_period_end?: number }[] } };
  const ts = s.items?.data?.[0]?.current_period_end ?? s.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

export async function syncStripeSubscription(sub: Stripe.Subscription) {
  const db = getDb();
  const status = mapStripeSubscriptionStatus(sub.status);
  const currentPeriodEnd = periodEnd(sub);

  let userId = sub.metadata?.userId;
  if (!userId) {
    const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, sub.id)).limit(1);
    userId = existing?.userId;
  }
  if (!userId) return;

  await db
    .insert(subscriptions)
    .values({ userId, providerSubscriptionId: sub.id, status, currentPeriodEnd })
    .onConflictDoUpdate({
      target: subscriptions.providerSubscriptionId,
      set: { status, currentPeriodEnd, updatedAt: new Date() },
    });

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (customerId) await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
}
