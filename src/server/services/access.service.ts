import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { computeAccess, type Access } from '@/core/billing';
import { isBeta } from '@/lib/config';
import { getDb } from '../db/client';
import { planLicenses, subscriptions, type User } from '../db/schema';

/** Acesso do usuário. Com `planId`, considera também o Passe do Edital daquele plano. */
export async function getUserAccess(user: Pick<User, 'id' | 'createdAt'>, planId?: string): Promise<Access> {
  const db = getDb();
  const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt));
  const subscription = subs.find((s) => s.status === 'active' || s.status === 'trialing') ?? subs[0] ?? null;

  let passExpiresAt: Date | null = null;
  if (planId) {
    const [lic] = await db
      .select()
      .from(planLicenses)
      .where(and(eq(planLicenses.userId, user.id), eq(planLicenses.planId, planId)))
      .limit(1);
    passExpiresAt = lic?.expiresAt ?? null;
  }

  return computeAccess({
    now: new Date(),
    betaFree: isBeta(),
    userCreatedAt: user.createdAt,
    subscription: subscription && { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd },
    passExpiresAt,
  });
}
