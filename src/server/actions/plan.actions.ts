"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { friendlyScheduleError } from "@/lib/errors";
import {
  parseAvailability,
  parseEditalMeta,
  parseMaxSubjectsPerDay,
  parseSubjectIds,
  parseSubjects,
} from "@/lib/forms";
import { todayInSaoPaulo } from "@/lib/today";
import { getDb } from "../db/client";
import { studyPlans, studySessions } from "../db/schema";
import {
  reportSetback,
  updateAvailability,
  type SetbackOutcome,
  type SetbackScope,
} from "../services/adjustment.service";
import { getUserAccess } from "../services/access.service";
import { createPlan, editPlan } from "../services/plan.service";
import { scheduleReviewsForSession } from "../services/review.service";
import type { FormState } from "./auth.actions";

const planSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Dê um nome ao plano (ex.: PF Agente 2026).")
    .max(80),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da prova."),
});

export async function createPlanAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { subjects, error } = parseSubjects(formData);
  if (error) return { error };
  const availabilityMinutes = parseAvailability(formData);
  if (!availabilityMinutes)
    return { error: "Revise as horas por dia: use valores entre 0 e 24." };

  let planId: string;
  try {
    planId = await createPlan(user.id, {
      name: parsed.data.name,
      examDate: parsed.data.examDate,
      startDate: todayInSaoPaulo(),
      subjects,
      availabilityMinutes,
      editalMeta: parseEditalMeta(formData),
      maxSubjectsPerDay: parseMaxSubjectsPerDay(formData),
    });
  } catch (e) {
    const friendly = friendlyScheduleError(e);
    if (friendly) return { error: friendly };
    throw e;
  }
  redirect(`/app/planos/${planId}`);
}

export async function updatePlanAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const planId = String(formData.get("planId") ?? "");
  const user = await assertCanUsePlan(planId);

  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.examDate <= todayInSaoPaulo())
    return { error: "A data da prova precisa ser depois de hoje." };

  const { subjects, error } = parseSubjects(formData);
  if (error) return { error };
  const ids = parseSubjectIds(formData);
  const availabilityMinutes = parseAvailability(formData);
  if (!availabilityMinutes)
    return { error: "Revise as horas por dia: use valores entre 0 e 24." };

  try {
    await editPlan(user.id, planId, {
      name: parsed.data.name,
      examDate: parsed.data.examDate,
      subjects: subjects.map((s, i) => ({ ...s, id: ids[i] || undefined })),
      availabilityMinutes,
      maxSubjectsPerDay: parseMaxSubjectsPerDay(formData),
    });
  } catch (e) {
    const friendly = friendlyScheduleError(e);
    if (friendly) return { error: friendly };
    throw e;
  }
  revalidatePath(`/app/planos/${planId}`);
  revalidatePath("/app");
  redirect(`/app/planos/${planId}?editado=ok`);
}

/** Garante que o usuário é dono do plano e pode usá-lo (assinante, passe ou teste). */
async function assertCanUsePlan(planId: string) {
  const user = await requireUser();
  const [plan] = await getDb()
    .select({ id: studyPlans.id })
    .from(studyPlans)
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, user.id)))
    .limit(1);
  if (!plan) redirect("/app");
  const access = await getUserAccess(user, planId);
  if (!access.canUse) redirect(`/app/assinatura?plano=${planId}`);
  return user;
}

export async function toggleSessionAction(formData: FormData): Promise<void> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const user = await assertCanUsePlan(planId);

  const db = getDb();
  const [session] = await db
    .select()
    .from(studySessions)
    .where(
      and(eq(studySessions.id, sessionId), eq(studySessions.planId, planId)),
    )
    .limit(1);
  if (!session || session.status === "skipped") return;

  const done = session.status === "completed";
  await db
    .update(studySessions)
    .set({
      status: done ? "pending" : "completed",
      completedAt: done ? null : new Date(),
    })
    .where(eq(studySessions.id, session.id));
  void user;

  if (!done) {
    // Acabou de concluir (não estava concluída antes): agenda as revisões de 24h/7d/30d.
    await scheduleReviewsForSession(session.id);
  }
  revalidatePath(`/app/planos/${planId}`);
  revalidatePath("/app");
}

function setbackRedirect(planId: string, outcome: SetbackOutcome): never {
  const qs = new URLSearchParams({
    ajuste: outcome.status,
    min: String(outcome.unallocatedMinutes || outcome.movedMinutes),
  });
  redirect(`/app/planos/${planId}?${qs}`);
}

export async function setbackAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await assertCanUsePlan(planId);
  const scope: SetbackScope =
    formData.get("scope") === "behind" ? "behind" : "today";
  const outcome = await reportSetback(user.id, planId, scope);
  revalidatePath(`/app/planos/${planId}`);
  setbackRedirect(planId, outcome);
}

export async function updateAvailabilityAction(
  formData: FormData,
): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await assertCanUsePlan(planId);
  const minutes = parseAvailability(formData);
  if (!minutes) redirect(`/app/planos/${planId}?ajuste=invalido`);

  await updateAvailability(user.id, planId, minutes);
  const outcome = await reportSetback(user.id, planId, "behind");
  revalidatePath(`/app/planos/${planId}`);
  setbackRedirect(planId, outcome);
}
