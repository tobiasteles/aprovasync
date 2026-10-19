import "server-only";
import { and, asc, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { addDays, generateSchedule } from "@/core/schedule";
import type { EditalMeta } from "@/core/edital";
import { todayInSaoPaulo } from "@/lib/today";
import { getDb } from "../db/client";
import {
  planAvailability,
  studyPlans,
  studySessions,
  subjects,
} from "../db/schema";

export const SUBJECT_COLORS = [
  "#2347C9",
  "#F4B400",
  "#0E9F8E",
  "#E4572E",
  "#7B5CD6",
  "#3E92CC",
  "#C2410C",
  "#5B7083",
];

export interface PlanInput {
  name: string;
  startDate: string;
  examDate: string;
  subjects: { name: string; weight: number; topics?: string[] }[];
  availabilityMinutes: number[];
  /** Presente quando o plano nasceu da leitura de um PDF de edital. */
  editalMeta?: EditalMeta;
  /** Quantas matérias diferentes por dia, no máximo. Sem isso, um dia pode intercalar todas. */
  maxSubjectsPerDay?: number;
}

/** Gera o cronograma (pode lançar ScheduleError) e grava tudo em uma transação. */
export async function createPlan(
  userId: string,
  input: PlanInput,
): Promise<string> {
  const draft = generateSchedule({
    startDate: input.startDate,
    examDate: input.examDate,
    weeklyAvailability: input.availabilityMinutes,
    subjects: input.subjects.map((s, i) => ({
      id: String(i),
      weight: s.weight,
    })),
    maxSubjectsPerDay: input.maxSubjectsPerDay,
  });

  return getDb().transaction(async (tx) => {
    const [plan] = await tx
      .insert(studyPlans)
      .values({
        userId,
        name: input.name,
        startDate: input.startDate,
        examDate: input.examDate,
        editalMeta: input.editalMeta ?? null,
        maxSubjectsPerDay: input.maxSubjectsPerDay ?? null,
      })
      .returning({ id: studyPlans.id });

    await tx
      .insert(planAvailability)
      .values(
        input.availabilityMinutes.map((minutes, weekday) => ({
          planId: plan.id,
          weekday,
          minutes,
        })),
      );

    const created = await tx
      .insert(subjects)
      .values(
        input.subjects.map((s, i) => ({
          planId: plan.id,
          name: s.name,
          weight: s.weight,
          position: i,
          color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
          topics: s.topics && s.topics.length > 0 ? s.topics : null,
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
    .where(
      and(eq(studyPlans.userId, userId), ne(studyPlans.status, "archived")),
    )
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
    db
      .select()
      .from(subjects)
      .where(eq(subjects.planId, planId))
      .orderBy(asc(subjects.position)),
    db
      .select()
      .from(planAvailability)
      .where(eq(planAvailability.planId, planId)),
    db
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.planId, planId),
          ne(studySessions.status, "skipped"),
        ),
      )
      .orderBy(asc(studySessions.date), asc(studySessions.createdAt)),
  ]);

  const weekly = Array.from(
    { length: 7 },
    (_, d) => availability.find((a) => a.weekday === d)?.minutes ?? 0,
  );
  return { plan, subjects: planSubjects, weeklyAvailability: weekly, sessions };
}

export interface EditPlanInput {
  name: string;
  examDate: string;
  /** `id` presente = matéria existente; ausente = matéria nova. */
  subjects: { id?: string; name: string; weight: number; topics?: string[] }[];
  availabilityMinutes: number[];
  maxSubjectsPerDay?: number;
}

/**
 * Edita um plano já criado. Mantém tudo que foi concluído e refaz só o futuro:
 * apaga as sessões pendentes de hoje em diante (menos revisões ainda válidas) e gera de novo.
 * O cronograma é calculado ANTES de mexer no banco: se der erro, nada muda.
 */
export async function editPlan(
  userId: string,
  planId: string,
  input: EditPlanInput,
): Promise<void> {
  const db = getDb();
  const [plan] = await db
    .select()
    .from(studyPlans)
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)))
    .limit(1);
  if (!plan) throw new Error("Plano não encontrado.");

  const existing = await db
    .select()
    .from(subjects)
    .where(eq(subjects.planId, planId));
  const existingById = new Map(existing.map((s) => [s.id, s]));
  for (const s of input.subjects) {
    if (s.id && !existingById.has(s.id)) throw new Error("Matéria inválida.");
  }

  // Se o usuário já concluiu algo hoje, o dia de hoje fica como está e refazemos a partir de amanhã.
  const today = todayInSaoPaulo();
  const [doneToday] = await db
    .select({ id: studySessions.id })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.planId, planId),
        eq(studySessions.date, today),
        eq(studySessions.status, "completed"),
      ),
    )
    .limit(1);
  const fromDate = doneToday ? addDays(today, 1) : today;

  const draft = generateSchedule({
    startDate: fromDate,
    examDate: input.examDate,
    weeklyAvailability: input.availabilityMinutes,
    subjects: input.subjects.map((s, i) => ({
      id: String(i),
      weight: s.weight,
    })),
    granularityMinutes: plan.granularityMinutes,
    utilization: plan.utilizationPct / 100,
    maxSubjectsPerDay: input.maxSubjectsPerDay,
  });

  await db.transaction(async (tx) => {
    await tx
      .update(studyPlans)
      .set({
        name: input.name,
        examDate: input.examDate,
        maxSubjectsPerDay: input.maxSubjectsPerDay ?? null,
        updatedAt: new Date(),
      })
      .where(eq(studyPlans.id, planId));

    for (let weekday = 0; weekday < 7; weekday++) {
      await tx
        .insert(planAvailability)
        .values({
          planId,
          weekday,
          minutes: input.availabilityMinutes[weekday],
        })
        .onConflictDoUpdate({
          target: [planAvailability.planId, planAvailability.weekday],
          set: { minutes: input.availabilityMinutes[weekday] },
        });
    }

    // Matérias removidas (as sessões delas caem junto, por cascade).
    const keepIds = new Set(
      input.subjects.flatMap((s) => (s.id ? [s.id] : [])),
    );
    const removed = existing.filter((s) => !keepIds.has(s.id)).map((s) => s.id);
    if (removed.length > 0)
      await tx.delete(subjects).where(inArray(subjects.id, removed));

    // Nome temporário nas renomeadas, para não bater no índice único (plano + nome) em trocas.
    for (const s of input.subjects) {
      if (s.id && existingById.get(s.id)!.name !== s.name) {
        await tx
          .update(subjects)
          .set({ name: `tmp-${s.id}` })
          .where(eq(subjects.id, s.id));
      }
    }

    const subjectIds: string[] = [];
    for (let i = 0; i < input.subjects.length; i++) {
      const s = input.subjects[i];
      const topics = s.topics && s.topics.length > 0 ? s.topics : null;
      if (s.id) {
        await tx
          .update(subjects)
          .set({ name: s.name, weight: s.weight, position: i, topics })
          .where(eq(subjects.id, s.id));
        subjectIds.push(s.id);
      } else {
        const [created] = await tx
          .insert(subjects)
          .values({
            planId,
            name: s.name,
            weight: s.weight,
            position: i,
            color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
            topics,
          })
          .returning({ id: subjects.id });
        subjectIds.push(created.id);
      }
    }

    // Apaga o futuro pendente. Revisões continuam, a não ser que caiam depois da nova data da prova.
    await tx
      .delete(studySessions)
      .where(
        and(
          eq(studySessions.planId, planId),
          eq(studySessions.status, "pending"),
          gte(studySessions.date, fromDate),
          or(
            ne(studySessions.origin, "review"),
            gte(studySessions.date, input.examDate),
          ),
        ),
      );

    const rows = draft.map((s) => ({
      planId,
      subjectId: subjectIds[Number(s.subjectId)],
      date: s.date,
      minutes: s.minutes,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      await tx.insert(studySessions).values(rows.slice(i, i + 500));
    }
  });
}
