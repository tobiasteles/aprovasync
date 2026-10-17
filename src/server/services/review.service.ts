import 'server-only';
import { and, eq, ne } from 'drizzle-orm';
import { scheduleReviews } from '@/core/schedule';
import { getDb } from '../db/client';
import { planAvailability, studyPlans, studySessions } from '../db/schema';

/**
 * Agenda as revisões (24h/7d/30d) de UMA sessão que acabou de ser concluída.
 * Só roda para sessões de estudo originais ('generated'), nunca a partir de uma revisão
 * (evita gerar revisão de revisão) e só uma vez por sessão (reviewsGenerated), mesmo que a
 * pessoa desmarque e marque de novo depois.
 */
export async function scheduleReviewsForSession(sessionId: string): Promise<void> {
  const db = getDb();
  const [session] = await db.select().from(studySessions).where(eq(studySessions.id, sessionId)).limit(1);
  if (!session || session.origin !== 'generated' || session.reviewsGenerated) return;

  const [plan] = await db.select().from(studyPlans).where(eq(studyPlans.id, session.planId)).limit(1);
  if (!plan) return;

  const [availabilityRows, otherSessions] = await Promise.all([
    db.select().from(planAvailability).where(eq(planAvailability.planId, plan.id)),
    db.select().from(studySessions).where(and(eq(studySessions.planId, plan.id), ne(studySessions.status, 'skipped'))),
  ]);
  const weekly = Array.from({ length: 7 }, (_, d) => availabilityRows.find((a) => a.weekday === d)?.minutes ?? 0);

  const loadByDate = new Map<string, number>();
  for (const s of otherSessions) if (s.id !== session.id) loadByDate.set(s.date, (loadByDate.get(s.date) ?? 0) + s.minutes);

  const reviews = scheduleReviews({
    seed: { subjectId: session.subjectId, studiedOn: session.date, originalMinutes: session.minutes },
    examDate: plan.examDate,
    weeklyAvailability: weekly,
    loadByDate,
    granularityMinutes: plan.granularityMinutes,
  });

  await db.transaction(async (tx) => {
    if (reviews.length > 0) {
      await tx.insert(studySessions).values(
        reviews.map((r) => ({
          planId: plan.id,
          subjectId: r.subjectId,
          date: r.date,
          minutes: r.minutes,
          origin: 'review' as const,
          reviewOffsetDays: r.offsetDays,
        })),
      );
    }
    await tx.update(studySessions).set({ reviewsGenerated: true }).where(eq(studySessions.id, session.id));
  });
}
