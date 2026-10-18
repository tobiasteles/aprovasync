import { ScheduleError, type ScheduleErrorCode } from '@/core/schedule';

const MESSAGES: Record<ScheduleErrorCode, string> = {
  INVALID_DATE: 'Data inválida. Confira o dia, o mês e o ano.',
  EXAM_NOT_AFTER_START: 'A data da prova precisa ser depois de hoje.',
  INVALID_SUBJECTS: 'Informe ao menos uma matéria, com peso maior que zero e sem nomes repetidos.',
  INVALID_AVAILABILITY: 'Revise as horas por dia: use valores entre 0 e 24.',
  INVALID_GRANULARITY: 'Tamanho de bloco inválido.',
  INVALID_UTILIZATION: 'Configuração de folga inválida.',
  NO_AVAILABLE_TIME: 'Com essas horas, não sobra tempo de estudo até a prova. Aumente as horas por dia ou confira a data.',
  INVALID_MAX_SUBJECTS_PER_DAY: 'O número máximo de matérias por dia deve ser 1 ou mais.',
};

export function friendlyScheduleError(error: unknown): string | null {
  return error instanceof ScheduleError ? MESSAGES[error.code] : null;
}
