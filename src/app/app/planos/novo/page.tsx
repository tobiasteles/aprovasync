import { PlanForm } from '@/components/plan/PlanForm';
import { addDays } from '@/core/schedule';
import { requireUser } from '@/lib/auth';
import { todayInSaoPaulo } from '@/lib/today';

export const metadata = { title: 'Novo plano' };

export default async function NewPlanPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Novo plano de estudos</h1>
        <p className="mt-1 text-ink-soft">Três passos rápidos. Depois você ajusta quando precisar.</p>
      </div>
      <PlanForm minDate={addDays(todayInSaoPaulo(), 1)} />
    </div>
  );
}
