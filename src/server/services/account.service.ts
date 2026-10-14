import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { getStripe } from '../billing/stripe';
import { getDb } from '../db/client';
import {
  passwordResetTokens,
  payments,
  planAdjustments,
  planAvailability,
  studyPlans,
  studySessions,
  subjects,
  subscriptions,
  users,
} from '../db/schema';

/** LGPD art. 18 (acesso/portabilidade): tudo o que guardamos sobre o titular, em JSON. */
export async function exportUserData(userId: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const plans = await db.select().from(studyPlans).where(eq(studyPlans.userId, userId));
  const planIds = plans.map((p) => p.id);
  const [subs, avail, sessions, adjustments] = planIds.length
    ? await Promise.all([
        db.select().from(subjects).where(inArray(subjects.planId, planIds)),
        db.select().from(planAvailability).where(inArray(planAvailability.planId, planIds)),
        db.select().from(studySessions).where(inArray(studySessions.planId, planIds)),
        db.select().from(planAdjustments).where(inArray(planAdjustments.planId, planIds)),
      ])
    : [[], [], [], []];

  const pay = await db.select().from(payments).where(eq(payments.userId, userId));
  const sub = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));

  return {
    exportadoEm: new Date().toISOString(),
    conta: {
      id: user.id,
      nome: user.name,
      email: user.email,
      criadaEm: user.createdAt,
      aceiteTermosEm: user.termsAcceptedAt,
      versaoTermos: user.termsVersion,
    },
    planos: plans.map((p) => ({
      ...p,
      materias: subs.filter((s) => s.planId === p.id),
      horasPorDiaDaSemana: avail.filter((a) => a.planId === p.id),
      sessoes: sessions.filter((s) => s.planId === p.id),
      reorganizacoes: adjustments.filter((a) => a.planId === p.id),
    })),
    pagamentos: pay.map(({ pixQrCode, pixQrBase64, ...rest }) => rest),
    assinaturas: sub,
  };
}

/**
 * Exclusão (LGPD art. 18, VI). Apaga dados de estudo, assinaturas e tokens; ANONIMIZA a conta.
 * Os registros de pagamento permanecem, sem identificar a pessoa, pelo prazo de guarda fiscal.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const db = getDb();

  // Cancela cobranças recorrentes antes de apagar (melhor esforço).
  const active = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, ['active', 'trialing', 'past_due'])));
  for (const s of active) {
    try {
      await getStripe().subscriptions.cancel(s.providerSubscriptionId);
    } catch (e) {
      console.error('[account] falha ao cancelar assinatura no Stripe', s.providerSubscriptionId, e);
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(studyPlans).where(eq(studyPlans.userId, userId)); // cascata: sessões, matérias, horas, licenças
    await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx
      .update(users)
      .set({
        email: `excluido-${userId}@aprovasync.invalid`,
        name: null,
        passwordHash: '!',
        stripeCustomerId: null,
        passwordChangedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });
}
