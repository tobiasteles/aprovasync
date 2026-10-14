import type { PlannedSession } from './shared';

export interface ProgressSummary {
  totalMinutes: number;
  completedMinutes: number;
  /** % do edital concluído, com 1 casa decimal (0–100). */
  percent: number;
  bySubject: Record<string, { totalMinutes: number; completedMinutes: number; percent: number }>;
}

const pct = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 1000) / 10);

export function calculateProgress(sessions: readonly Pick<PlannedSession, 'subjectId' | 'minutes' | 'completed'>[]): ProgressSummary {
  const bySubject: ProgressSummary['bySubject'] = {};
  let total = 0;
  let done = 0;
  for (const s of sessions) {
    const b = (bySubject[s.subjectId] ??= { totalMinutes: 0, completedMinutes: 0, percent: 0 });
    b.totalMinutes += s.minutes;
    total += s.minutes;
    if (s.completed) {
      b.completedMinutes += s.minutes;
      done += s.minutes;
    }
  }
  for (const b of Object.values(bySubject)) b.percent = pct(b.completedMinutes, b.totalMinutes);
  return { totalMinutes: total, completedMinutes: done, percent: pct(done, total), bySubject };
}
