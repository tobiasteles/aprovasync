import Link from 'next/link';
import { daysBetween } from '@/core/schedule';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { requireUser } from '@/lib/auth';
import { formatDateLong } from '@/lib/format';
import { todayInSaoPaulo } from '@/lib/today';
import { listPlans } from '@/server/services/plan.service';

export const metadata = { title: 'Meus planos' };

export default async function Dashboard() {
  const user = await requireUser();
  const plans = await listPlans(user.id);
  const today = todayInSaoPaulo();
  const firstName = (user.name ?? '').split(' ')[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Olá{firstName ? `, ${firstName}` : ''} 👋</h1>
          <p className="mt-1 text-ink-soft">Um passo de cada vez. O resto a gente reorganiza.</p>
        </div>
        <Link href="/app/planos/novo" className="btn btn-primary">+ Novo plano</Link>
      </div>

      {plans.length === 0 ? (
        <div className="card py-14 text-center">
          <p className="text-lg font-bold">Vamos montar o seu primeiro cronograma?</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">Leva 2 minutos: data da prova, matérias e as horas que você tem por dia.</p>
          <Link href="/app/planos/novo" className="btn btn-gold mt-6">Criar meu plano</Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {plans.map((p) => {
            const percent = p.total === 0 ? 0 : Math.round((p.done / p.total) * 1000) / 10;
            const left = daysBetween(today, p.examDate);
            return (
              <Link key={p.id} href={`/app/planos/${p.id}`} className="card block transition hover:-translate-y-0.5 hover:border-royal-300">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold">{p.name}</h2>
                  <span className="badge bg-royal-50 text-royal-700">{percent}%</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  Prova em {formatDateLong(p.examDate)} · {left > 0 ? `faltam ${left} dias` : left === 0 ? 'é hoje!' : 'já passou'}
                </p>
                <div className="mt-4"><ProgressBar percent={percent} color="#F4B400" /></div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
