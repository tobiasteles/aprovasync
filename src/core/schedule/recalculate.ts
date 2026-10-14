import { listDays, weekdayOf } from './dates';
import {
  DEFAULT_GRANULARITY_MINUTES,
  assertAvailability,
  assertGranularity,
  type ISODate,
  type PlannedSession,
  type SubjectMinutes,
  type WeeklyAvailability,
} from './shared';

export type RedistributionStrategy = 'asap' | 'balanced';

export interface RecalculateInput {
  /** Todas as sessões do plano com status pending/completed (as já "skipped" não entram). */
  sessions: readonly PlannedSession[];
  /**
   * Primeiro dia que pode receber carga. Tudo que está pendente ANTES desta data é "atrasado".
   * Normalmente: hoje (se ainda dá para estudar) ou amanhã (se o dia de hoje foi perdido).
   */
  fromDate: ISODate;
  examDate: ISODate;
  weeklyAvailability: WeeklyAvailability;
  granularityMinutes?: number;
  /**
   * 'asap'     – preenche os primeiros dias com folga (recupera o atraso o quanto antes).
   * 'balanced' – nivela a folga entre os dias (menos pressão por dia). Padrão.
   */
  strategy?: RedistributionStrategy;
}

export interface RecalculateResult {
  /** Plano completo atualizado, ordenado por data. Sessões atrasadas foram removidas e re-alocadas. */
  sessions: PlannedSession[];
  /** Minutos atrasados que foram retirados do passado, por matéria. */
  moved: SubjectMinutes[];
  /** Minutos que NÃO couberam até a prova (sem estourar o limite diário), por matéria. */
  unallocated: SubjectMinutes[];
  /** true se todo o atraso foi re-alocado. */
  feasible: boolean;
}

function addTo(map: Map<string, number>, key: string, minutes: number) {
  map.set(key, (map.get(key) ?? 0) + minutes);
}

function toList(map: Map<string, number>): SubjectMinutes[] {
  return [...map].map(([subjectId, minutes]) => ({ subjectId, minutes }));
}

function pickDay(strategy: RedistributionStrategy, free: readonly number[], size: number): number {
  if (strategy === 'asap') {
    for (let i = 0; i < free.length; i++) if (free[i] >= size) return i;
    return -1;
  }
  let best = -1;
  for (let i = 0; i < free.length; i++) {
    if (free[i] >= size && (best === -1 || free[i] > free[best])) best = i;
  }
  return best;
}

/**
 * Botão "Imprevisto": redistribui o atraso nos dias restantes até a prova.
 * Função pura – não muta a entrada. Garante: carga diária <= disponibilidade do dia da semana
 * (considerando o que já estava agendado) e nenhuma sessão no dia da prova ou depois.
 * Se não couber, devolve o excedente em `unallocated` em vez de estourar o limite.
 */
export function recalculateSchedule(input: RecalculateInput): RecalculateResult {
  const g = input.granularityMinutes ?? DEFAULT_GRANULARITY_MINUTES;
  const strategy = input.strategy ?? 'balanced';
  assertGranularity(g);
  assertAvailability(input.weeklyAvailability);

  const days = listDays(input.fromDate, input.examDate); // [] se fromDate >= examDate

  const overdue = input.sessions
    .filter((s) => !s.completed && s.date < input.fromDate)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const kept = input.sessions.filter((s) => s.completed || s.date >= input.fromDate).map((s) => ({ ...s }));

  // Folga de cada dia = limite do dia da semana - o que já está agendado nele.
  const load = new Map<string, number>();
  for (const s of kept) addTo(load, s.date, s.minutes);
  const free = days.map((d) => Math.max(0, input.weeklyAvailability[weekdayOf(d)] - (load.get(d) ?? 0)));

  const moved = new Map<string, number>();
  const unallocated = new Map<string, number>();
  const placed = new Map<string, { date: ISODate; subjectId: string; minutes: number }>();

  for (const s of overdue) {
    addTo(moved, s.subjectId, s.minutes);
    let rest = s.minutes;
    while (rest > 0) {
      const chunk = Math.min(g, rest);
      rest -= chunk;
      const di = pickDay(strategy, free, chunk);
      if (di === -1) {
        addTo(unallocated, s.subjectId, chunk);
        continue;
      }
      free[di] -= chunk;
      const key = `${days[di]}|${s.subjectId}`;
      const cur = placed.get(key);
      if (cur) cur.minutes += chunk;
      else placed.set(key, { date: days[di], subjectId: s.subjectId, minutes: chunk });
    }
  }

  const created: PlannedSession[] = [...placed.values()].map((p) => ({
    date: p.date,
    subjectId: p.subjectId,
    minutes: p.minutes,
    completed: false,
    rescheduled: true,
  }));

  const sessions = [...kept, ...created].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return { sessions, moved: toList(moved), unallocated: toList(unallocated), feasible: unallocated.size === 0 };
}
