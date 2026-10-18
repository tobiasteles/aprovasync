import { listDays, weekdayOf } from './dates';
import {
  DEFAULT_GRANULARITY_MINUTES,
  DEFAULT_UTILIZATION,
  ScheduleError,
  assertAvailability,
  assertGranularity,
  assertMaxSubjectsPerDay,
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
  /**
   * Quantas matérias DIFERENTES podem aparecer no mesmo dia. Sem isso (padrão), um dia pode
   * intercalar todas as matérias que tiverem espaço — bom com poucas matérias, mas vira uma
   * colcha de retalhos com muitas. Defina, por exemplo, 3 para blocos de poucas matérias por dia.
   * Com a folga padrão (utilization < 1) o limite nunca é violado. Só no caso extremo de
   * `utilization: 1` (zero folga) combinado com um limite bem apertado, pode sobrar um resto de
   * minutos sem outro lugar para caber dentro do limite; nesse caso o algoritmo prefere colocar
   * esse resto num dia específico, mesmo passando do limite, a perder silenciosamente o tempo que
   * o peso da matéria garantiu.
   */
  maxSubjectsPerDay?: number;
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
 *  4. Intercala as matérias em cada dia (round-robin ponderado), sem jamais passar do limite diário
 *     nem, se `maxSubjectsPerDay` for informado, do número de matérias diferentes permitido no dia.
 */
export function generateSchedule(input: GenerateInput): PlannedSession[] {
  const g = input.granularityMinutes ?? DEFAULT_GRANULARITY_MINUTES;
  const u = input.utilization ?? DEFAULT_UTILIZATION;
  assertGranularity(g);
  assertUtilization(u);
  assertAvailability(input.weeklyAvailability);
  assertSubjects(input.subjects);
  if (input.maxSubjectsPerDay != null) assertMaxSubjectsPerDay(input.maxSubjectsPerDay);

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

  interface DayBucket {
    perSubject: Map<number, number>; // índice da matéria -> blocos
    todaysSubjects: Set<number>; // quais matérias já "entraram" no dia, para respeitar o limite
    used: number; // blocos já ocupados no dia (perSubject somado)
  }
  const perDay: DayBucket[] = days.map(() => ({ perSubject: new Map(), todaysSubjects: new Set(), used: 0 }));

  /**
   * Preenche um dia bloco a bloco, sempre escolhendo a matéria com maior fração de cota pendente,
   * até `capacity` blocos ou faltar matéria elegível. `allowNewSubject` decide se uma matéria que
   * ainda não apareceu nesse dia pode entrar (é aqui que o limite de matérias é aplicado).
   */
  function fillDay(day: DayBucket, capacity: number, allowNewSubject: () => boolean): void {
    while (day.used < capacity) {
      let best = -1;
      let bestRatio = -1;
      for (let j = 0; j < quotas.length; j++) {
        if (quotas[j] === 0 || remaining[j] === 0) continue;
        if (!day.todaysSubjects.has(j) && !allowNewSubject()) continue;
        const ratio = remaining[j] / quotas[j];
        if (ratio > bestRatio) {
          best = j;
          bestRatio = ratio;
        }
      }
      if (best === -1) break;
      day.todaysSubjects.add(best);
      day.used += 1;
      remaining[best] -= 1;
      day.perSubject.set(best, (day.perSubject.get(best) ?? 0) + 1);
    }
  }

  const max = input.maxSubjectsPerDay;
  // Passada 1: como antes — preenche a meta do dia (dayLoad) respeitando o limite de matérias.
  days.forEach((_, di) => {
    fillDay(perDay[di], dayLoad[di], () => max == null || perDay[di].todaysSubjects.size < max);
  });

  if (max != null) {
    // Passada 2 ("resgate"): com o limite, um dia pode esgotar as matérias que admitiu antes de
    // usar toda a sua capacidade FÍSICA (ex.: as 2 matérias do dia terminaram a cota mais cedo).
    // Usa a folga entre o que foi planejado (dayLoad) e a capacidade real (capSlots) do PRÓPRIO
    // dia, ainda respeitando o limite — nenhuma matéria "estranha" entra aqui.
    days.forEach((_, di) => {
      fillDay(perDay[di], capSlots[di], () => perDay[di].todaysSubjects.size < max);
    });

    // Passada 3 (último recurso, raro): se ainda sobrar tempo sem onde caber dentro do limite em
    // lugar nenhum, preenche ignorando o limite — mas ainda dia a dia, então a sobra se espalha
    // por vários dias em vez de empilhar tudo num só. Perder minutos de estudo que o peso da
    // matéria garantiu seria pior do que, eventualmente, um dia ter uma matéria a mais.
    days.forEach((_, di) => {
      fillDay(perDay[di], capSlots[di], () => true);
    });
  }

  const sessions: PlannedSession[] = [];
  days.forEach((date, di) => {
    for (const [j, slots] of perDay[di].perSubject) {
      sessions.push({ date, subjectId: input.subjects[j].id, minutes: slots * g, completed: false });
    }
  });

  return sessions;
}
