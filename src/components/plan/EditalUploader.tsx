'use client';

import { useRef, useState } from 'react';
import type { EditalExtraction } from '@/core/edital';
import { PlanForm, type PlanFormInitial } from './PlanForm';

interface ParseResponse {
  extraction: EditalExtraction;
  prefill: { name: string; examDate: string | null; subjects: { name: string; weight: number; topics: string[] }[] };
  truncated: boolean;
}

const money = (v: string | null) => v ?? '—';

function SummaryCard({ data, onDismiss }: { data: ParseResponse; onDismiss: () => void }) {
  const e = data.extraction;
  return (
    <div className="card space-y-4 border-royal-200 bg-royal-50/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="badge bg-royal-100 text-royal-700">Lido do seu PDF</p>
          <h2 className="mt-2 text-xl font-bold">{[e.cargo, e.orgao].filter(Boolean).join(' — ') || 'Edital'}</h2>
        </div>
        <button type="button" onClick={onDismiss} className="shrink-0 text-sm text-ink-soft underline hover:text-royal-700">
          Preencher do zero
        </button>
      </div>
      <p className="text-sm text-ink-soft">{e.resumo}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-ink-soft">Banca</dt><dd className="font-medium">{money(e.banca)}</dd></div>
        <div><dt className="text-xs text-ink-soft">Vagas</dt><dd className="font-medium">{e.vagas ?? '—'}</dd></div>
        <div><dt className="text-xs text-ink-soft">Salário</dt><dd className="font-medium">{money(e.salario)}</dd></div>
        <div><dt className="text-xs text-ink-soft">Taxa</dt><dd className="font-medium">{money(e.taxaInscricao)}</dd></div>
        <div><dt className="text-xs text-ink-soft">Fim das inscrições</dt><dd className="font-medium">{money(e.dataInscricaoFim)}</dd></div>
        <div><dt className="text-xs text-ink-soft">Data da prova</dt><dd className="font-medium">{money(e.dataProva)}</dd></div>
      </dl>
      {!e.dataProva && (
        <p className="rounded-xl bg-gold-100/60 px-4 py-2.5 text-sm text-gold-700">
          Não encontramos a data da prova neste edital — preencha abaixo, no passo 1.
        </p>
      )}
      {data.truncated && (
        <p className="rounded-xl bg-paper-2 px-4 py-2.5 text-xs text-ink-soft">
          O PDF era longo; lemos o início do documento. Confira se todas as matérias importantes entraram.
        </p>
      )}
    </div>
  );
}

export function EditalUploader({ minDate, canUseEdital }: { minDate: string; canUseEdital: boolean }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus('loading');
    setError(null);
    try {
      const body = new FormData();
      body.set('file', file);
      const res = await fetch('/api/edital/parse', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Não conseguimos ler este edital. Tente de novo.');
        setStatus('error');
        return;
      }
      setResult(data as ParseResponse);
      setFormVersion((v) => v + 1);
      setStatus('idle');
    } catch {
      setError('Falha de conexão. Tente de novo.');
      setStatus('error');
    }
  }

  const initial: PlanFormInitial | undefined = result
    ? {
        name: result.prefill.name,
        examDate: result.prefill.examDate ?? undefined,
        subjects: result.prefill.subjects,
      }
    : undefined;

  return (
    <div className="space-y-6">
      {!result && canUseEdital && (
        <div className="card border-dashed text-center">
          <p className="font-bold">Já tem o edital em PDF?</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
            Envie o arquivo e preenchemos o cargo, as matérias e os pesos para você. Revise tudo antes de gerar o cronograma.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
          <button type="button" className="btn btn-gold mt-4" disabled={status === 'loading'} onClick={() => inputRef.current?.click()}>
            {status === 'loading' ? 'Lendo o edital…' : 'Enviar PDF do edital'}
          </button>
          {status === 'error' && error && (
            <p role="alert" className="mx-auto mt-3 max-w-md rounded-xl bg-orange-50 px-4 py-3 text-sm text-warn">
              {error}
            </p>
          )}
          <p className="mt-3 text-xs text-ink-soft">Ou preencha manualmente abaixo.</p>
        </div>
      )}

      {!result && !canUseEdital && (
        <div className="card border-gold-300 bg-gold-100/30 text-center">
          <p className="font-bold">Leitura automática do edital em PDF</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
            Essa função é exclusiva para assinantes: enviamos o PDF para ler cargo, matérias e pesos por você.
          </p>
          <a href="/app/assinatura" className="btn btn-gold mt-4">Assinar para liberar</a>
          <p className="mt-3 text-xs text-ink-soft">Sem assinatura, é só preencher manualmente abaixo — leva poucos minutos.</p>
        </div>
      )}

      {result && <SummaryCard data={result} onDismiss={() => setResult(null)} />}

      <PlanForm key={formVersion} minDate={minDate} initial={initial} editalMeta={result?.extraction} />
    </div>
  );
}
