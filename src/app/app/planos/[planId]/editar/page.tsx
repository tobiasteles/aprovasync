import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlanForm } from "@/components/plan/PlanForm";
import { addDays } from "@/core/schedule";
import { requireUser } from "@/lib/auth";
import { todayInSaoPaulo } from "@/lib/today";
import { getUserAccess } from "@/server/services/access.service";
import { loadPlanView } from "@/server/services/plan.service";

export const metadata = { title: "Editar plano" };

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const user = await requireUser();
  const { planId } = await params;

  const view = await loadPlanView(user.id, planId);
  if (!view) notFound();
  const access = await getUserAccess(user, planId);
  if (!access.canUse) redirect(`/app/assinatura?plano=${planId}`);

  const { plan, subjects, weeklyAvailability } = view;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/app/planos/${plan.id}`}
          className="text-sm text-ink-soft hover:text-royal-600"
        >
          ← Voltar ao plano
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Editar plano
        </h1>
        <p className="mt-1 text-ink-soft">{plan.name}</p>
      </div>
      <PlanForm
        planId={plan.id}
        minDate={addDays(todayInSaoPaulo(), 1)}
        initial={{
          name: plan.name,
          examDate: plan.examDate,
          maxSubjectsPerDay: plan.maxSubjectsPerDay,
          availabilityHours: weeklyAvailability.map((m) => m / 60),
          subjects: subjects.map((s) => ({
            id: s.id,
            name: s.name,
            weight: s.weight,
            topics: s.topics ?? undefined,
          })),
        }}
      />
    </div>
  );
}
