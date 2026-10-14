import { listDays, weekdayOf } from './dates';
import {
  DEFAULT_GRANULARITY_MINUTES,
  DEFAULT_UTILIZATION,
  ScheduleError,
  assertAvailability,
  assertGranularity,
  assertSubjects,
  assertUtilization,
  type ISODate,
  type PlannedSession,
  type SubjectInput,
  type WeeklyAvailability,
} from './shared';

export interface GenerateInput {
  startDate: ISODate;
  /** Dia da prova. O último dia de estudo é o dia anterior. */
  examDate: ISODate;
  weeklyAvailability: WeeklyAvailability;
  subjects: readonly SubjectInput[];
  /** Tamanho do menor bloco de estudo, em minutos. Padrão: 30. */
  granularityMinutes?: number;
  /** Fração (0,1] da capacidade total a ser planejada. Padrão: 0.85 (15% de folga p/ imprevistos). */
  utilization?: number;
}

/**
 * Método do maior resto (Hamilton): divide `total` unidades inteiras proporcionalmente aos pesos,
 * garantindo que a soma seja exatamente `total`. Empates resolvidos pelo menor índice (determinístico).
 */
export function apportion(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const base = exact.map(Math.floor);
  let left = total - base.reduce((a, b) => a + b, 0);
  const order = exact
    .map((e, i) => ({ i, frac: e - base[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    if (weights[i] <= 0) continue;
    base[i] += 1;
    left -= 1;
  }
  return base;
}

/**
 * Gera o cronograma inicial: função pura e determinística.
 *  1. Calcula a capacidade (em blocos) de cada dia entre `startDate` e `examDate` (exclusive).
 *  2. Reserva folga (`utilization`) e distribui a carga entre os dias proporcionalmente à capacidade.
 *  3. Divide a carga total entre as matérias proporcionalmente ao peso.
 *  4. Intercala as matérias em cada dia (round-robin ponderado), sem jamais passar do limite diário.
 */
export function generateSchedule(input: GenerateInput): PlannedSession[] {
  const g = input.granularityMinutes ?? DEFAULT_GRANULARITY_MINUTES;
  const u = input.utilization ?? DEFAULT_UTILIZATION;
  assertGranularity(g);
  assertUtilization(u);
  assertAvailability(input.weeklyAvailability);
  assertSubjects(input.subjects);

  const days = listDays(input.startDate, input.examDate);
  if (days.length === 0) {
    throw new ScheduleError('EXAM_NOT_AFTER_START', 'A data da prova deve ser posterior à data de início.');
  }

  const capSlots = days.map((d) => Math.floor(input.weeklyAvailability[weekdayOf(d)] / g));
  const totalCap = capSlots.reduce((a, b) => a + b, 0);
  const targetSlots = Math.floor(totalCap * u + 1e-9);
  if (targetSlots <= 0) {
    throw new ScheduleError('NO_AVAILABLE_TIME', 'Não há tempo disponível suficiente até a data da prova.');
  }

  const dayLoad = apportion(targetSlots, capSlots).map((n, i) => Math.min(n, capSlots[i]));
  const quotas = apportion(targetSlots, input.subjects.map((s) => s.weight));
  const remaining = [...quotas];

  const sessions: PlannedSession[] = [];
  days.forEach((date, di) => {
    const perSubject = new Map<number, number>(); // índice da matéria -> blocos (preserva ordem)
    for (let k = 0; k < dayLoad[di]; k++) {
      // Escolhe a matéria com maior fração de cota ainda pendente (distribuição suave).
      let best = -1;
      let bestRatio = -1;
      for (let j = 0; j < quotas.length; j++) {
        if (quotas[j] === 0 || remaining[j] === 0) continue;
        const ratio = remaining[j] / quotas[j];
        if (ratio > bestRatio) {
          best = j;
          bestRatio = ratio;
        }
      }
      if (best === -1) break;
      remaining[best] -= 1;
      perSubject.set(best, (perSubject.get(best) ?? 0) + 1);
    }
    for (const [j, slots] of perSubject) {
      sessions.push({ date, subjectId: input.subjects[j].id, minutes: slots * g, completed: false });
    }
  });

  return sessions;
}
