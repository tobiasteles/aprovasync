'use client';

import { useActionState, useState } from 'react';
import { createPlanAction } from '@/server/actions/plan.actions';
import type { FormState } from '@/server/actions/auth.actions';
import { SubmitButton } from '../ui/SubmitButton';
import { AvailabilityFields } from './AvailabilityFields';

const PLACEHOLDERS = ['Língua Portuguesa', 'Raciocínio Lógico', 'Direito Constitucional', 'Informática'];

export function PlanForm({ minDate }: { minDate: string }) {
  const [state, action] = useActionState<FormState, FormData>(createPlanAction, undefined);
  const [rows, setRows] = useState([0, 1, 2]);
  const [nextId, setNextId] = useState(3);

  return (
    <form action={action} className="space-y-8">
      <section className="card space-y-4">
        <h2 className="text-lg font-bold">1. Sua prova</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Nome do plano</label>
            <input id="name" name="name" className="input" placeholder="Ex.: PF Agente 2026" required />
          </div>
          <div>
            <label className="label" htmlFor="examDate">Data da prova</label>
            <input id="examDate" name="examDate" type="date" className="input" min={minDate} required />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-bold">2. Matérias e pesos</h2>
          <p className="mt-1 text-sm text-ink-soft">Peso maior = mais tempo no cronograma. Use 1 a 10 (ex.: 3 para uma matéria que cai muito).</p>
        </div>
        <div className="space-y-3">
          {rows.map((id, i) => (
            <div key={id} className="flex items-center gap-3">
              <input
                name="subjectName"
                className="input flex-1"
                placeholder={PLACEHOLDERS[i % PLACEHOLDERS.length]}
                aria-label={`Nome da matéria ${i + 1}`}
              />
              <input
                name="subjectWeight"
                type="number"
                min={1}
                max={10}
                defaultValue={3}
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
          ))}
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
