'use server';

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { PRICING } from '@/core/billing';
import { requireUser } from '@/lib/auth';
import { isBeta } from '@/lib/config';
import { appUrl } from '@/lib/env';
import { rateLimit, RULES } from '@/lib/ratelimit';
import { getDb } from '../db/client';
import { payments, studyPlans } from '../db/schema';
import { createPixPayment } from '../billing/mercadopago';
import { getStripe } from '../billing/stripe';

const BILLING = '/app/assinatura';

/** Limita criação de cobranças por usuário (evita abuso e lixo de Pix pendentes). */
async function guardCheckout(userId: string) {
  if (isBeta()) redirect('/app'); // beta gratuito: pagamentos desligados
  const limited = await rateLimit(RULES.checkoutUser, userId);
  if (!limited.ok) redirect(`${BILLING}?status=muitas`);
}

async function ownedPlan(userId: string, planId: string) {
  const [plan] = await getDb()
    .select()
    .from(studyPlans)
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)))
    .limit(1);
  return plan ?? null;
}

/** Assinatura mensal – cartão (Stripe Checkout). */
export async function startSubscriptionCheckoutAction(): Promise<void> {
  const user = await requireUser();
  await guardCheckout(user.id);
  let url: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      locale: 'pt-BR',
      allowed_payment_method_types: ['card'],
      ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: PRICING.currency,
            unit_amount: PRICING.subscription.amountCents,
            recurring: { interval: 'month' },
            product_data: { name: `AprovaSync – ${PRICING.subscription.name}`, description: PRICING.subscription.description },
          },
        },
      ],
      metadata: { userId: user.id, kind: 'subscription' },
      subscription_data: { metadata: { userId: user.id } },
      success_url: `${appUrl()}${BILLING}?status=sucesso`,
      cancel_url: `${appUrl()}${BILLING}?status=cancelado`,
    });
    url = session.url;
  } catch (e) {
    console.error('[stripe] checkout assinatura', e);
  }
  redirect(url ?? `${BILLING}?status=erro`);
}

/** Passe do Edital – cartão (Stripe Checkout, pagamento único). */
export async function startPassCardCheckoutAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await guardCheckout(user.id);
  const plan = await ownedPlan(user.id, String(formData.get('planId') ?? ''));
  if (!plan) redirect(`${BILLING}?status=sem-plano`);

  let url: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      locale: 'pt-BR',
      allowed_payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: PRICING.currency,
            unit_amount: PRICING.pass.amountCents,
            product_data: { name: `AprovaSync – ${PRICING.pass.name}`, description: `Plano: ${plan.name}` },
          },
        },
      ],
      metadata: { userId: user.id, planId: plan.id, kind: 'pass' },
      success_url: `${appUrl()}/app/planos/${plan.id}?pagamento=ok`,
      cancel_url: `${appUrl()}${BILLING}?status=cancelado&plano=${plan.id}`,
    });
    url = session.url;
  } catch (e) {
    console.error('[stripe] checkout passe', e);
  }
  redirect(url ?? `${BILLING}?status=erro`);
}

/** Passe do Edital – Pix (Mercado Pago). Gera o QR Code e leva para a tela de pagamento. */
export async function startPassPixCheckoutAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await guardCheckout(user.id);
  const plan = await ownedPlan(user.id, String(formData.get('planId') ?? ''));
  if (!plan) redirect(`${BILLING}?status=sem-plano`);

  let paymentId: string | null = null;
  try {
    const pix = await createPixPayment({
      amountCents: PRICING.pass.amountCents,
      description: `AprovaSync – ${PRICING.pass.name} (${plan.name})`,
      email: user.email,
      externalReference: `${user.id}:${plan.id}`,
      idempotencyKey: randomUUID(),
    });
    const [row] = await getDb()
      .insert(payments)
      .values({
        userId: user.id,
        planId: plan.id,
        provider: 'mercadopago',
        providerPaymentId: pix.id,
        amountCents: PRICING.pass.amountCents,
        status: 'pending',
        pixQrCode: pix.qrCode,
        pixQrBase64: pix.qrBase64,
        pixExpiresAt: pix.expiresAt,
      })
      .returning({ id: payments.id });
    paymentId = row.id;
  } catch (e) {
    console.error('[mercadopago] pix', e);
  }
  redirect(paymentId ? `${BILLING}/pix/${paymentId}` : `${BILLING}?status=erro&plano=${plan.id}`);
}

/** Portal do cliente Stripe: trocar cartão, ver faturas, cancelar. */
export async function openBillingPortalAction(): Promise<void> {
  const user = await requireUser();
  if (!user.stripeCustomerId) redirect(BILLING);
  let url: string | null = null;
  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl()}${BILLING}`,
    });
    url = portal.url;
  } catch (e) {
    console.error('[stripe] portal', e);
  }
  redirect(url ?? `${BILLING}?status=erro`);
}
