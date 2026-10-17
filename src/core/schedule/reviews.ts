import { addDays, listDays, weekdayOf } from './dates';
import { assertAvailability, assertGranularity, DEFAULT_GRANULARITY_MINUTES, type ISODate, type WeeklyAvailability } from './shared';

/** Método 24h/7d/30d: o mais citado na literatura de preparação para concursos no Brasil. */
export const REVIEW_OFFSETS_DAYS = [1, 7, 30] as const;
/** Cada revisão é mais curta que o estudo original (não é reler tudo, é relembrar). */
export const REVIEW_DURATION_RATIO = 0.4;

export interface ReviewSeed {
  subjectId: string;
  /** Data em que a matéria foi efetivamente estudada (quando a sessão foi concluída). */
  studiedOn: ISODate;
  originalMinutes: number;
}

export interface PlannedReview {
  date: ISODate;
  subjectId: string;
  minutes: number;
  /** Qual revisão é esta (1, 7 ou 30 dias). Útil para rotular na interface. */
  offsetDays: number;
}

export interface ReviewPlanInput {
  seed: ReviewSeed;
  examDate: ISODate;
  weeklyAvailability: WeeklyAvailability;
  /** Carga já ocupada em cada dia (estudo + revisões já agendadas), para não estourar o limite. */
  loadByDate: ReadonlyMap<string, number>;
  granularityMinutes?: number;
}

/**
 * Agenda as revisões de uma sessão concluída, respeitando o limite diário (como o Imprevisto) e
 * nunca ultrapassando a véspera da prova. Revisões cujo dia ideal não existe mais (prova já passou
 * aquela data) são simplesmente omitidas — não empurramos para depois da prova.
 */
export function scheduleReviews(input: ReviewPlanInput): PlannedReview[] {
  const g = input.granularityMinutes ?? DEFAULT_GRANULARITY_MINUTES;
  assertGranularity(g);
  assertAvailability(input.weeklyAvailability);

  const minutes = Math.max(g, Math.round((input.seed.originalMinutes * REVIEW_DURATION_RATIO) / g) * g);
  const lastStudyDay = addDays(input.examDate, -1);
  const out: PlannedReview[] = [];
  // Cópia local: cada revisão colocada precisa contar na carga antes de posicionar a próxima,
  // senão duas revisões da mesma sessão podem cair no mesmo dia e juntas estourar o limite.
  const load = new Map(input.loadByDate);

  for (const offsetDays of REVIEW_OFFSETS_DAYS) {
    const ideal = addDays(input.seed.studiedOn, offsetDays);
    if (ideal > lastStudyDay) continue; // não cabe mais antes da prova

    const placed = findFirstFittingDay(ideal, lastStudyDay, minutes, input.weeklyAvailability, load);
    if (!placed) continue; // sem espaço algum até a prova: melhor omitir do que estourar o limite

    load.set(placed, (load.get(placed) ?? 0) + minutes);
    out.push({ date: placed, subjectId: input.seed.subjectId, minutes, offsetDays });
  }
  return out;
}

function findFirstFittingDay(
  from: ISODate,
  until: ISODate,
  minutes: number,
  weekly: WeeklyAvailability,
  loadByDate: ReadonlyMap<string, number>,
): ISODate | null {
  for (const date of listDays(from, addDays(until, 1))) {
    const cap = weekly[weekdayOf(date)];
    const used = loadByDate.get(date) ?? 0;
    if (cap - used >= minutes) return date;
  }
  return null;
}
