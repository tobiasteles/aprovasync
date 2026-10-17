import { addDays, weekdayOf } from '@/core/schedule';

export interface DayMinutes {
  date: string;
  planned: number;
  completed: number;
}

/**
 * Mapa de constância (estilo "gráfico de contribuições"), sem sequência que QUEBRA.
 * Faltar um dia só deixa uma célula vazia — nunca zera um contador nem pune visualmente,
 * porque isso contradiria a proposta do produto ("perdeu um dia, a gente reorganiza").
 */
export function ConsistencyMap({ today, days, weeks = 10 }: { today: string; days: DayMinutes[]; weeks?: number }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const totalDays = weeks * 7;
  // Alinha a grade ao domingo da semana mais antiga, igual a um calendário real.
  const start = addDays(today, -(totalDays - 1) - weekdayOf(addDays(today, -(totalDays - 1))));
  const cells = Array.from({ length: Math.ceil((daysSince(start, today) + 1) / 7) * 7 }, (_, i) => addDays(start, i));

  const level = (d: DayMinutes | undefined) => {
    if (!d || d.planned === 0) return 0;
    const ratio = d.completed / d.planned;
    if (ratio <= 0) return 0;
    if (ratio < 1) return 1;
    return 2;
  };
  const colors = ['var(--color-paper-2)', 'var(--color-gold-200)', 'var(--color-gold-500)'];

  const columns: string[][] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1" role="img" aria-label="Mapa de constância dos últimos dias de estudo">
        {columns.map((col) => (
          <div key={col[0]} className="flex flex-col gap-1">
            {col.map((date) => {
              const future = date > today;
              return (
                <div
                  key={date}
                  title={date}
                  className="h-3 w-3 rounded-[3px]"
                  style={{ background: future ? 'transparent' : colors[level(byDate.get(date))] }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-soft">
        <span>menos</span>
        {colors.map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />
        ))}
        <span>mais</span>
      </div>
    </div>
  );
}

function daysSince(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);
}
