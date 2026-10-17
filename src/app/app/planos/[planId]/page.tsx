import Link from 'next/link';
import { notFound } from 'next/navigation';
import { calculateProgress, computePace, daysBetween } from '@/core/schedule';
import { AvailabilityFields } from '@/components/plan/AvailabilityFields';
import { ConsistencyMap, type DayMinutes } from '@/components/plan/ConsistencyMap';
import { PaceBadge } from '@/components/plan/PaceBadge';
import { SessionRow } from '@/components/plan/SessionRow';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { isBeta } from '@/lib/config';
import { requireUser } from '@/lib/auth';
import { formatDateLong, formatDay, formatMinutes } from '@/lib/format';
import { todayInSaoPaulo } from '@/lib/today';
import { setbackAction, updateAvailabilityAction } from '@/server/actions/plan.actions';
import { getUserAccess } from '@/server/services/access.service';
import type { Access } from '@/core/billing';
import { loadPlanView } from '@/server/services/plan.service';

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * O recálculo acabou de dar certo: é o pico de confiança no produto ("funcionou mesmo").
 * Para quem ainda está no teste, esse é o melhor momento para pedir a conversão — melhor que
 * um aviso genérico de "seu teste acabou" mais tarde, sem contexto nenhum.
 */
function ImprevistoUpsell({ planId, minutes, access }: { planId: string; minutes: number; access: Access }) {
  if (isBeta() || access.kind !== 'trial') return null;
  const daysLeft = access.until ? Math.max(0, Math.ceil((access.until.getTime() - Date.now()) / 86_400_000)) : null;
  return (
    <div className="card mt-3 flex flex-wrap items-center justify-between gap-4 border-gold-300 bg-gold-100/40">
      <div>
        <p className="font-bold">Foi por isso que te mostramos o Imprevisto primeiro.</p>
        <p className="mt-1 text-sm text-ink-soft">
          Sem reorganizar, essas {formatMinutes(minutes)} teriam virado atraso acumulado.
          {daysLeft !== null && daysLeft > 0 && ` Seu teste grátis vale por mais ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}.`}
        </p>
      </div>
      <Link href={`/app/assinatura?plano=${planId}`} className="btn btn-gold shrink-0">Garantir meu acesso</Link>
    </div>
  );
}

function Notice({ sp, planId, access }: { sp: SP; planId: string; access: Access }) {
  const ajuste = first(sp.ajuste);
  const min = Number(first(sp.min) ?? 0);
  if (first(sp.pagamento) === 'ok')
    return <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm text-ok">Pagamento recebido! Se o acesso ainda não liberou, aguarde alguns segundos e atualize a página.</div>;
  if (ajuste === 'ok')
    return (
      <div>
        <div className="rounded-2xl bg-royal-50 px-5 py-4 text-sm text-royal-800"><strong>Pronto.</strong> Reorganizamos {formatMinutes(min)} de estudo nos próximos dias. Um passo de cada vez.</div>
        <ImprevistoUpsell planId={planId} minutes={min} access={access} />
      </div>
    );
  if (ajuste === 'nothing')
    return <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm text-ok">Você não tem nada atrasado. Tudo em dia! 🎉</div>;
  if (ajuste === 'no_room')
    return <div className="rounded-2xl bg-orange-50 px-5 py-4 text-sm text-warn"><strong>Não cabe tudo até a prova com as horas atuais:</strong> faltam {formatMinutes(min)}. Aumente as horas por dia em “Ajustar horas” abaixo e reorganizamos de novo. Nada foi alterado.</div>;
  if (ajuste === 'invalido')
    return <div className="rounded-2xl bg-orange-50 px-5 py-4 text-sm text-warn">Revise as horas: use valores entre 0 e 24.</div>;
  return null;
}

export default async function PlanPage({ params, searchParams }: { params: Promise<{ planId: string }>; searchParams: Promise<SP> }) {
  const user = await requireUser();
  const { planId } = await params;
  const sp = await searchParams;

  const view = await loadPlanView(user.id, planId);
  if (!view) notFound();
  const { plan, subjects, sessions, weeklyAvailability } = view;
  const access = await getUserAccess(user, planId);

  const today = todayInSaoPaulo();
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const progress = calculateProgress(
    sessions.map((s) => ({ subjectId: s.subjectId, minutes: s.minutes, completed: s.status === 'completed' })),
  );
  const pace = computePace({
    startDate: plan.startDate,
    examDate: plan.examDate,
    today,
    totalMinutes: progress.totalMinutes,
    completedMinutes: progress.completedMinutes,
  });
  const dayMap = new Map<string, DayMinutes>();
  for (const s of sessions) {
    const d = dayMap.get(s.date) ?? { date: s.date, planned: 0, completed: 0 };
    d.planned += s.minutes;
    if (s.status === 'completed') d.completed += s.minutes;
    dayMap.set(s.date, d);
  }
  const consistencyDays = [...dayMap.values()];

  const overdue = sessions.filter((s) => s.status !== 'completed' && s.date < today);
  const overdueMinutes = overdue.reduce((a, s) => a + s.minutes, 0);
  const todays = sessions.filter((s) => s.date === today);
  const upcoming = new Map<string, typeof sessions>();
  for (const s of sessions) {
    if (s.date > today && s.date < plan.examDate) upcoming.set(s.date, [...(upcoming.get(s.date) ?? []), s]);
  }
  const upcomingDays = [...upcoming.entries()].slice(0, 28);
  const daysLeft = daysBetween(today, plan.examDate);

  const row = (s: (typeof sessions)[number]) => {
    const subj = subjectById.get(s.subjectId);
    return (
      <SessionRow
        key={s.id}
        id={s.id}
        planId={plan.id}
        subjectName={subj?.name ?? 'Matéria'}
        color={subj?.color ?? '#2347C9'}
        minutes={s.minutes}
        completed={s.status === 'completed'}
        origin={s.origin}
        reviewOffsetDays={s.reviewOffsetDays}
        disabled={!access.canUse}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-sm text-ink-soft hover:text-royal-600">← Meus planos</Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{plan.name}</h1>
        <p className="text-ink-soft">
          Prova em {formatDateLong(plan.examDate)} · {daysLeft > 0 ? `faltam ${daysLeft} dias` : daysLeft === 0 ? 'é hoje!' : 'já aconteceu'}
        </p>
      </div>

      {plan.editalMeta && (
        <details className="card">
          <summary className="cursor-pointer font-bold">Sobre este edital</summary>
          <div className="mt-3 space-y-3 text-sm">
            <p className="text-ink-soft">{plan.editalMeta.resumo}</p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><dt className="text-xs text-ink-soft">Banca</dt><dd className="font-medium">{plan.editalMeta.banca ?? '—'}</dd></div>
              <div><dt className="text-xs text-ink-soft">Vagas</dt><dd className="font-medium">{plan.editalMeta.vagas ?? '—'}</dd></div>
              <div><dt className="text-xs text-ink-soft">Salário</dt><dd className="font-medium">{plan.editalMeta.salario ?? '—'}</dd></div>
              <div><dt className="text-xs text-ink-soft">Taxa</dt><dd className="font-medium">{plan.editalMeta.taxaInscricao ?? '—'}</dd></div>
            </dl>
            {subjects.some((s) => s.topics && s.topics.length > 0) && (
              <div className="space-y-2 border-t border-line pt-3">
                {subjects.filter((s) => s.topics && s.topics.length > 0).map((s) => (
                  <div key={s.id}>
                    <p className="text-xs font-semibold text-ink-soft">{s.name}</p>
                    <p className="text-ink-soft">{s.topics!.join(' · ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      <Notice sp={sp} planId={plan.id} access={access} />

      {!access.canUse && (
        <div className="card flex flex-wrap items-center justify-between gap-4 border-gold-300 bg-gold-100/40">
          <div>
            <p className="font-bold">Seu teste grátis terminou</p>
            <p className="text-sm text-ink-soft">Você ainda vê o cronograma, mas para marcar estudos e usar o Imprevisto é preciso liberar o plano.</p>
          </div>
          <Link href={`/app/assinatura?plano=${plan.id}`} className="btn btn-gold">Liberar este plano</Link>
        </div>
      )}

      {/* Progresso */}
      <section className="card grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="mx-auto"><ProgressRing percent={progress.percent} /></div>
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">
            {formatMinutes(progress.completedMinutes)} concluídas de {formatMinutes(progress.totalMinutes)} planejadas
          </p>
          {subjects.map((s) => {
            const b = progress.bySubject[s.id];
            return (
              <div key={s.id}>
                <div className="mb-1 flex justify-between text-xs font-medium">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.color ?? '#2347C9' }} />{s.name}</span>
                  <span className="text-ink-soft">{b?.percent ?? 0}%</span>
                </div>
                <ProgressBar percent={b?.percent ?? 0} color={s.color ?? '#2347C9'} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Ritmo e constância */}
      <section className="card space-y-4">
        <PaceBadge pace={pace} />
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-soft">Sua constância</p>
          <ConsistencyMap today={today} days={consistencyDays} />
        </div>
      </section>

      {/* Imprevisto */}
      <section className={`card ${overdueMinutes > 0 ? 'border-orange-200 bg-orange-50/50' : ''}`}>
        <h2 className="text-lg font-bold">Tive um imprevisto</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {overdueMinutes > 0
            ? `Você tem ${formatMinutes(overdueMinutes)} atrasadas. Sem drama: a gente reorganiza.`
            : 'Aconteceu algo hoje? Reorganizamos a matéria nos próximos dias, sem passar do seu limite diário.'}
        </p>
        <form action={setbackAction} className="mt-4 space-y-3">
          <input type="hidden" name="planId" value={plan.id} />
          <label className="flex items-start gap-3 rounded-xl border border-line bg-white p-3 text-sm">
            <input type="radio" name="scope" value="today" defaultChecked={overdueMinutes === 0} className="mt-0.5 accent-[#2347C9]" />
            <span><strong>Não consegui estudar hoje.</strong><br /><span className="text-ink-soft">Recalcula a partir de amanhã.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-line bg-white p-3 text-sm">
            <input type="radio" name="scope" value="behind" defaultChecked={overdueMinutes > 0} className="mt-0.5 accent-[#2347C9]" />
            <span><strong>Estou com dias atrasados.</strong><br /><span className="text-ink-soft">Move tudo o que ficou para trás e recalcula a partir de hoje.</span></span>
          </label>
          <SubmitButton className="btn btn-primary" pendingText="Reorganizando…">Reorganizar meu plano</SubmitButton>
        </form>
      </section>

      {/* Hoje */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Hoje · {formatDay(today)}</h2>
        {todays.length > 0 ? todays.map(row) : <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-center text-sm text-ink-soft">Nada planejado para hoje. Descanso também faz parte do plano. 🌿</p>}
      </section>

      {/* Próximos dias */}
      {upcomingDays.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Próximos dias</h2>
          {upcomingDays.map(([date, list]) => (
            <div key={date} className="space-y-2">
              <p className="text-sm font-semibold capitalize text-ink-soft">
                {formatDay(date)} · {formatMinutes(list.reduce((a, s) => a + s.minutes, 0))}
              </p>
              {list.map(row)}
            </div>
          ))}
        </section>
      )}

      {/* Ajustar horas */}
      <details className="card">
        <summary className="cursor-pointer font-bold">Ajustar horas por dia</summary>
        <form action={updateAvailabilityAction} className="mt-4 space-y-4">
          <input type="hidden" name="planId" value={plan.id} />
          <AvailabilityFields defaultHours={weeklyAvailability.map((m) => m / 60)} />
          <SubmitButton className="btn btn-ghost" pendingText="Salvando…">Salvar e reorganizar</SubmitButton>
        </form>
      </details>
    </div>
  );
}
