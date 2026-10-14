import 'server-only';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { addDays, recalculateSchedule, type PlannedSession } from '@/core/schedule';
import { todayInSaoPaulo } from '@/lib/today';
import { getDb } from '../db/client';
import { planAdjustments, planAvailability, studyPlans, studySessions } from '../db/schema';

/** today: "perdi hoje" (recalcula a partir de amanhã) · behind: "estou atrasado" (recalcula a partir de hoje). */
export type SetbackScope = 'today' | 'behind';

export interface SetbackOutcome {
  status: 'nothing' | 'ok' | 'no_room';
  movedMinutes: number;
  unallocatedMinutes: number;
}

const sum = (list: { minutes: number }[]) => list.reduce((a, b) => a + b.minutes, 0);

/**
 * Botão "Imprevisto". Se tudo couber, aplica de forma atômica; se NÃO couber, não altera nada
 * (evita sumir com horas do plano) e devolve quanto falta para o usuário decidir.
 */
export async function reportSetback(userId: string, planId: string, scope: SetbackScope): Promise<SetbackOutcome> {
  const db = getDb();
  const today = todayInSaoPaulo();
  const fromDate = scope === 'today' ? addDays(today, 1) : today;

  const [plan] = await db
    .select()
    .from(studyPlans)
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)))
    .limit(1);
  if (!plan) throw new Error('Plano não encontrado.');

  const availabilityRows = await db.select().from(planAvailability).where(eq(planAvailability.planId, planId));
  const weekly = Array.from({ length: 7 }, (_, d) => availabilityRows.find((a) => a.weekday === d)?.minutes ?? 0);

  const rows = await db
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.planId, planId), ne(studySessions.status, 'skipped')));

  const sessions: PlannedSession[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    subjectId: r.subjectId,
    minutes: r.minutes,
    completed: r.status === 'completed',
    rescheduled: r.origin === 'rescheduled',
  }));

  const result = recalculateSchedule({
    sessions,
    fromDate,
    examDate: plan.examDate,
    weeklyAvailability: weekly,
    granularityMinutes: plan.granularityMinutes,
  });

  const overdueIds = sessions.filter((s) => !s.completed && s.date < fromDate).map((s) => s.id!);
  if (overdueIds.length === 0) return { status: 'nothing', movedMinutes: 0, unallocatedMinutes: 0 };

  const movedMinutes = sum(result.moved);
  const unallocatedMinutes = sum(result.unallocated);
  if (!result.feasible) return { status: 'no_room', movedMinutes, unallocatedMinutes };

  const created = result.sessions.filter((s) => s.rescheduled && !s.id);

  await db.transaction(async (tx) => {
    await tx.update(studySessions).set({ status: 'skipped' }).where(inArray(studySessions.id, overdueIds));
    if (created.length > 0) {
      await tx.insert(studySessions).values(
        created.map((s) => ({
          planId,
          subjectId: s.subjectId,
          date: s.date,
          minutes: s.minutes,
          origin: 'rescheduled' as const,
        })),
      );
    }
    await tx.insert(planAdjustments).values({
      planId,
      fromDate,
      movedMinutes,
      unallocatedMinutes: 0,
      reason: scope,
    });
  });

  return { status: 'ok', movedMinutes, unallocatedMinutes: 0 };
}

/** Atualiza as horas por dia da semana (usado quando o atraso não cabe). */
export async function updateAvailability(userId: string, planId: string, minutes: number[]) {
  const db = getDb();
  const [plan] = await db
    .select({ id: studyPlans.id })
    .from(studyPlans)
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)))
    .limit(1);
  if (!plan) throw new Error('Plano não encontrado.');

  await db.transaction(async (tx) => {
    for (let weekday = 0; weekday < 7; weekday++) {
      await tx
        .insert(planAvailability)
        .values({ planId, weekday, minutes: minutes[weekday] })
        .onConflictDoUpdate({
          target: [planAvailability.planId, planAvailability.weekday],
          set: { minutes: minutes[weekday] },
        });
    }
  });
}
