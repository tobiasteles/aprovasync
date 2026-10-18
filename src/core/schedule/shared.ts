/** Tipos, erros e validações compartilhadas pelo motor de cronograma (100% puro, sem I/O). */

export type ISODate = string; // 'YYYY-MM-DD'

/** Minutos disponíveis por dia da semana. Índice 0 = domingo ... 6 = sábado. */
export type WeeklyAvailability = readonly number[];

export const DEFAULT_GRANULARITY_MINUTES = 30;
/** Fração da capacidade que o plano ocupa. O resto é "folga" para absorver imprevistos. */
export const DEFAULT_UTILIZATION = 0.85;

export interface SubjectInput {
  id: string;
  weight: number;
}

export interface PlannedSession {
  id?: string;
  date: ISODate;
  subjectId: string;
  minutes: number;
  completed: boolean;
  /** true quando a sessão foi criada por um recálculo (botão "Imprevisto"). */
  rescheduled?: boolean;
}

export interface SubjectMinutes {
  subjectId: string;
  minutes: number;
}

export type ScheduleErrorCode =
  | 'INVALID_DATE'
  | 'EXAM_NOT_AFTER_START'
  | 'INVALID_SUBJECTS'
  | 'INVALID_AVAILABILITY'
  | 'INVALID_GRANULARITY'
  | 'INVALID_UTILIZATION'
  | 'NO_AVAILABLE_TIME'
  | 'INVALID_MAX_SUBJECTS_PER_DAY';

export class ScheduleError extends Error {
  constructor(
    public readonly code: ScheduleErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ScheduleError';
  }
}

export function assertAvailability(av: WeeklyAvailability): void {
  if (!Array.isArray(av) || av.length !== 7) {
    throw new ScheduleError('INVALID_AVAILABILITY', 'A disponibilidade semanal precisa ter 7 valores (dom..sáb).');
  }
  for (const m of av) {
    if (!Number.isInteger(m) || m < 0 || m > 1440) {
      throw new ScheduleError('INVALID_AVAILABILITY', 'Minutos por dia devem ser inteiros entre 0 e 1440.');
    }
  }
}

export function assertGranularity(g: number): void {
  if (!Number.isInteger(g) || g <= 0 || g > 240) {
    throw new ScheduleError('INVALID_GRANULARITY', 'A granularidade deve ser um inteiro entre 1 e 240 minutos.');
  }
}

export function assertUtilization(u: number): void {
  if (!(u > 0 && u <= 1)) {
    throw new ScheduleError('INVALID_UTILIZATION', 'A utilização deve estar no intervalo (0, 1].');
  }
}

export function assertMaxSubjectsPerDay(n: number): void {
  if (!Number.isInteger(n) || n < 1) {
    throw new ScheduleError('INVALID_MAX_SUBJECTS_PER_DAY', 'O número máximo de matérias por dia deve ser um inteiro de 1 ou mais.');
  }
}

export function assertSubjects(subjects: readonly SubjectInput[]): void {
  if (!subjects || subjects.length === 0) {
    throw new ScheduleError('INVALID_SUBJECTS', 'Informe ao menos uma matéria.');
  }
  const seen = new Set<string>();
  for (const s of subjects) {
    if (!Number.isFinite(s.weight) || s.weight <= 0) {
      throw new ScheduleError('INVALID_SUBJECTS', `Peso inválido na matéria "${s.id}".`);
    }
    if (seen.has(s.id)) {
      throw new ScheduleError('INVALID_SUBJECTS', `Matéria duplicada: "${s.id}".`);
    }
    seen.add(s.id);
  }
}
