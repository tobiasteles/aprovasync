import type { Pace } from '@/core/schedule';

const COPY: Record<Pace['status'], { text: (d: number) => string; cls: string }> = {
  ahead: { text: (d) => `Você está ${d} ${d === 1 ? 'dia' : 'dias'} à frente do ritmo necessário.`, cls: 'bg-emerald-50 text-ok' },
  on_track: { text: () => 'Você está exatamente no ritmo necessário para terminar o edital a tempo.', cls: 'bg-royal-50 text-royal-800' },
  behind: { text: (d) => `Você está ${Math.abs(d)} ${Math.abs(d) === 1 ? 'dia' : 'dias'} atrás do ritmo necessário.`, cls: 'bg-orange-50 text-warn' },
  not_started: { text: () => 'Seu ritmo aparece aqui assim que você começar a estudar.', cls: 'bg-paper-2 text-ink-soft' },
  finished: { text: () => 'O prazo do plano já passou.', cls: 'bg-paper-2 text-ink-soft' },
  done: { text: () => 'Edital concluído! 🎉', cls: 'bg-emerald-50 text-ok' },
};

/**
 * Ritmo medido contra o PRÓPRIO plano (o que seria necessário para terminar a tempo),
 * nunca contra outras pessoas: evita o efeito de comparação social que pode aumentar
 * a ansiedade do público que o produto tenta justamente acalmar.
 */
export function PaceBadge({ pace }: { pace: Pace }) {
  const c = COPY[pace.status];
  return <p className={`badge ${c.cls} !inline-block !rounded-xl px-4 py-2.5 text-sm font-medium`}>{c.text(pace.daysDelta)}</p>;
}
