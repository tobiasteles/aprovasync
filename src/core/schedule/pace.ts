import { daysBetween } from './dates';
import type { ISODate } from './shared';

export interface PaceInput {
  startDate: ISODate;
  examDate: ISODate;
  today: ISODate;
  totalMinutes: number;
  completedMinutes: number;
}

export type PaceStatus = 'ahead' | 'on_track' | 'behind' | 'not_started' | 'finished' | 'done';

export interface Pace {
  status: PaceStatus;
  /** Dias de folga (positivo) ou de atraso (negativo) no ritmo atual, comparado ao necessário. */
  daysDelta: number;
  expectedPercent: number;
  actualPercent: number;
}

/**
 * Compara o progresso real com o ritmo que seria necessário para terminar na véspera da prova,
 * SEM comparar a pessoa com outras — só com o relógio do próprio plano. Evita o efeito ansiogênico
 * de rankings entre concurseiros, mantendo o mesmo tipo de motivação (saber onde se está).
 */
export function computePace(input: PaceInput): Pace {
  const totalDays = daysBetween(input.startDate, input.examDate);
  const elapsedDays = daysBetween(input.startDate, input.today);
  const actualPercent = input.totalMinutes === 0 ? 0 : (input.completedMinutes / input.totalMinutes) * 100;

  if (input.totalMinutes === 0 || totalDays <= 0) {
    return { status: 'not_started', daysDelta: 0, expectedPercent: 0, actualPercent };
  }
  if (elapsedDays <= 0) {
    return { status: 'not_started', daysDelta: 0, expectedPercent: 0, actualPercent };
  }
  if (actualPercent >= 100) {
    return { status: 'done', daysDelta: totalDays - elapsedDays, expectedPercent: 100, actualPercent };
  }
  if (elapsedDays >= totalDays) {
    return { status: 'finished', daysDelta: 0, expectedPercent: 100, actualPercent };
  }

  const expectedPercent = Math.min(100, (elapsedDays / totalDays) * 100);
  // Em quantos dias de ritmo médio a pessoa está adiantada/atrasada, no total do plano.
  const daysDelta = Math.round(((actualPercent - expectedPercent) / 100) * totalDays);

  const status: PaceStatus = daysDelta >= 1 ? 'ahead' : daysDelta <= -1 ? 'behind' : 'on_track';
  return { status, daysDelta, expectedPercent: Math.round(expectedPercent * 10) / 10, actualPercent };
}
