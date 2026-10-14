import 'server-only';
import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import { generateSchedule } from '@/core/schedule';
import { getDb } from '../db/client';
import { planAvailability, studyPlans, studySessions, subjects } from '../db/schema';

export const SUBJECT_COLORS = ['#2347C9', '#F4B400', '#0E9F8E', '#E4572E', '#7B5CD6', '#3E92CC', '#C2410C', '#5B7083'];

export interface PlanInput {
  name: string;
  startDate: string;
  examDate: string;
  subjects: { name: string; weight: number }[];
  availabilityMinutes: number[];
}

/** Gera o cronograma (pode lançar ScheduleError) e grava tudo em uma transação. */
export async function createPlan(userId: string, input: PlanInput): Promise<string> {
  const draft = generateSchedule({
    startDate: input.startDate,
    examDate: input.examDate,
    weeklyAvailability: input.availabilityMinutes,
    subjects: input.subjects.map((s, i) => ({ id: String(i), weight: s.weight })),
  });

  return getDb().transaction(async (tx) => {
    const [plan] = await tx
      .insert(studyPlans)
      .values({ userId, name: input.name, startDate: input.startDate, examDate: input.examDate })
      .returning({ id: studyPlans.id });

    await tx
      .insert(planAvailability)
      .values(input.availabilityMinutes.map((minutes, weekday) => ({ planId: plan.id, weekday, minutes })));

    const created = await tx
      .insert(subjects)
      .values(
        input.subjects.map((s, i) => ({
          planId: plan.id,
          name: s.name,
          weight: s.weight,
          position: i,
          color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
        })),
      )
      .returning({ id: subjects.id, name: subjects.name });
    const idByName = new Map(created.map((c) => [c.name, c.id]));

    const rows = draft.map((s) => ({
      planId: plan.id,
      subjectId: idByName.get(input.subjects[Number(s.subjectId)].name)!,
      date: s.date,
      minutes: s.minutes,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      await tx.insert(studySessions).values(rows.slice(i, i + 500));
    }
    return plan.id;
  });
}

export async function listPlans(userId: string) {
  const rows = await getDb()
    .select({
      id: studyPlans.id,
      name: studyPlans.name,
      examDate: studyPlans.examDate,
      total: sql<number>`coalesce(sum(${studySessions.minutes}) filter (where ${studySessions.status} <> 'skipped'), 0)::int`,
      done: sql<number>`coalesce(sum(${studySessions.minutes}) filter (where ${studySessions.status} = 'completed'), 0)::int`,
    })
    .from(studyPlans)
    .leftJoin(studySessions, eq(studySessions.planId, studyPlans.id))
    .where(and(eq(studyPlans.userId, userId), ne(studyPlans.status, 'archived')))
    .groupBy(studyPlans.id)
    .orderBy(desc(studyPlans.createdAt));
  return rows;
}

export async function loadPlanView(userId: string, planId: string) {
  const db = getDb();
  const [plan] = await db
    .select()
    .from(studyPlans)
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)))
    .limit(1);
  if (!plan) return null;

  const [planSubjects, availability, sessions] = await Promise.all([
    db.select().from(subjects).where(eq(subjects.planId, planId)).orderBy(asc(subjects.position)),
    db.select().from(planAvailability).where(eq(planAvailability.planId, planId)),
    db
      .select()
      .from(studySessions)
      .where(and(eq(studySessions.planId, planId), ne(studySessions.status, 'skipped')))
      .orderBy(asc(studySessions.date), asc(studySessions.createdAt)),
  ]);

  const weekly = Array.from({ length: 7 }, (_, d) => availability.find((a) => a.weekday === d)?.minutes ?? 0);
  return { plan, subjects: planSubjects, weeklyAvailability: weekly, sessions };
}
