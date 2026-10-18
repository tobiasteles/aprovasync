'use client';

import { useActionState, useState } from 'react';
import type { EditalMeta } from '@/core/edital';
import { createPlanAction } from '@/server/actions/plan.actions';
import type { FormState } from '@/server/actions/auth.actions';
import { SubmitButton } from '../ui/SubmitButton';
import { AvailabilityFields } from './AvailabilityFields';

const PLACEHOLDERS = ['Língua Portuguesa', 'Raciocínio Lógico', 'Direito Constitucional', 'Informática'];

export interface PlanFormInitial {
  name?: string;
  examDate?: string;
  subjects?: { name: string; weight: number; topics?: string[] }[];
}

export function PlanForm({ minDate, initial, editalMeta }: { minDate: string; initial?: PlanFormInitial; editalMeta?: EditalMeta }) {
  const [state, action] = useActionState<FormState, FormData>(createPlanAction, undefined);
  const seedRows = initial?.subjects?.length ? initial.subjects.map((_, i) => i) : [0, 1, 2];
  const [rows, setRows] = useState<number[]>(seedRows);
  const [nextId, setNextId] = useState(seedRows.length);

  return (
    <form action={action} className="space-y-8">
      {editalMeta && <input type="hidden" name="editalMeta" value={JSON.stringify(editalMeta)} />}

      <section className="card space-y-4">
        <h2 className="text-lg font-bold">1. Sua prova</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Nome do plano</label>
            <input id="name" name="name" className="input" placeholder="Ex.: PF Agente 2026" defaultValue={initial?.name} required />
          </div>
          <div>
            <label className="label" htmlFor="examDate">Data da prova</label>
            <input id="examDate" name="examDate" type="date" className="input" min={minDate} defaultValue={initial?.examDate ?? undefined} required />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-bold">2. Matérias e pesos</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {initial?.subjects?.length
              ? 'Já preenchemos a partir do edital. Confira e ajuste se precisar.'
              : 'Peso maior = mais tempo no cronograma. Use 1 a 10 (ex.: 3 para uma matéria que cai muito).'}
          </p>
        </div>
        <div className="space-y-3">
          {rows.map((id, i) => {
            const subj = initial?.subjects?.[i];
            return (
              <div key={id} className="flex items-center gap-3">
                <input type="hidden" name="subjectTopics" value={JSON.stringify(subj?.topics ?? [])} />
                <input
                  name="subjectName"
                  className="input flex-1"
                  placeholder={PLACEHOLDERS[i % PLACEHOLDERS.length]}
                  defaultValue={subj?.name}
                  aria-label={`Nome da matéria ${i + 1}`}
                />
                <input
                  name="subjectWeight"
                  type="number"
                  min={1}
                  max={10}
                  defaultValue={subj?.weight ?? 3}
                  className="input w-20 text-center"
                  aria-label={`Peso da matéria ${i + 1}`}
                />
                <button
                  type="button"
                  className="rounded-lg px-2 py-2 text-ink-soft hover:bg-paper-2 disabled:opacity-30"
                  onClick={() => setRows((r) => r.filter((x) => x !== id))}
                  disabled={rows.length <= 1}
                  aria-label={`Remover matéria ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setRows((r) => [...r, nextId]);
            setNextId((n) => n + 1);
          }}
        >
          + Adicionar matéria
        </button>
        <div className="border-t border-line pt-4">
          <label className="label" htmlFor="maxSubjectsPerDay">Quantas matérias estudar por dia, no máximo?</label>
          <select id="maxSubjectsPerDay" name="maxSubjectsPerDay" className="input w-full sm:w-64" defaultValue="3">
            <option value="">Sem limite (intercala todas)</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'matéria' : 'matérias'} por dia</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-soft">Com menos matérias por dia, você estuda em blocos mais focados em vez de um pouco de tudo todo dia.</p>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-bold">3. Quanto você consegue estudar</h2>
          <p className="mt-1 text-sm text-ink-soft">Horas por dia da semana. Seja realista: guardamos uma folga de 15% para os imprevistos da vida.</p>
        </div>
        <AvailabilityFields />
      </section>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-warn">
          {state.error}
        </p>
      )}
      <SubmitButton className="btn btn-primary w-full sm:w-auto" pendingText="Montando seu cronograma…">
        Gerar meu cronograma
      </SubmitButton>
    </form>
  );
}
