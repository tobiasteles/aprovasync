import { addDays } from '../schedule/dates';
import type { ISODate } from '../schedule/shared';
import { PRICING } from './pricing';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';
export type AccessKind = 'subscriber' | 'pass' | 'trial' | 'beta' | 'none';

export interface Access {
  kind: AccessKind;
  canUse: boolean;
  until: Date | null;
}

export interface AccessInput {
  now: Date;
  userCreatedAt: Date;
  subscription?: { status: SubscriptionStatus; currentPeriodEnd: Date | null } | null;
  /** Fim da licença do plano em questão (Passe do Edital), se houver. */
  passExpiresAt?: Date | null;
  /** Modo beta: todo mundo usa de graça. */
  betaFree?: boolean;
}

const DAY_MS = 86_400_000;

/** Quem pode usar o quê. Ordem de prioridade: assinante > passe > teste grátis > nenhum. */
export function computeAccess(i: AccessInput): Access {
  if (i.betaFree) return { kind: 'beta', canUse: true, until: null };

  const now = i.now.getTime();
  const sub = i.subscription;

  if (sub) {
    const grace = PRICING.pastDueGraceDays * DAY_MS;
    const ok =
      sub.status === 'active' ||
      sub.status === 'trialing' ||
      (sub.status === 'past_due' && sub.currentPeriodEnd !== null && now < sub.currentPeriodEnd.getTime() + grace);
    if (ok) return { kind: 'subscriber', canUse: true, until: sub.currentPeriodEnd };
  }

  if (i.passExpiresAt && i.passExpiresAt.getTime() > now) {
    return { kind: 'pass', canUse: true, until: i.passExpiresAt };
  }

  const trialEnd = new Date(i.userCreatedAt.getTime() + PRICING.trialDays * DAY_MS);
  if (now < trialEnd.getTime()) return { kind: 'trial', canUse: true, until: trialEnd };

  return { kind: 'none', canUse: false, until: null };
}

/**
 * Validade do Passe: até o fim (horário de Brasília) do dia `examDate + carência`.
 * Se a prova já passou ou está muito próxima, garante um mínimo de `passMinDays` a partir de agora.
 */
export function licenseExpiry(
  examDate: ISODate,
  now: Date,
  graceDays: number = PRICING.passGraceDays,
  minDays: number = PRICING.passMinDays,
): Date {
  // 00:00 BRT do dia seguinte = 03:00 UTC.
  const byExam = new Date(`${addDays(examDate, graceDays + 1)}T03:00:00.000Z`);
  const byMin = new Date(now.getTime() + minDays * DAY_MS);
  return byExam.getTime() > byMin.getTime() ? byExam : byMin;
}
