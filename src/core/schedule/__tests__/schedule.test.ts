import { describe, expect, test } from 'vitest';
import { addDays, daysBetween, listDays, toUTC, weekdayOf } from '../dates';
import { apportion, generateSchedule, type GenerateInput } from '../generate';
import { computePace, type PaceStatus } from '../pace';
import { scheduleReviews } from '../reviews';
import { calculateProgress } from '../progress';
import { recalculateSchedule } from '../recalculate';
import { ScheduleError, type PlannedSession, type WeeklyAvailability } from '../shared';

/* ----------------------------- helpers ----------------------------- */

const ALL_60: WeeklyAvailability = [60, 60, 60, 60, 60, 60, 60];
const ALL_120: WeeklyAvailability = [120, 120, 120, 120, 120, 120, 120];
const sum = (n: number[]) => n.reduce((a, b) => a + b, 0);
const totalMinutes = (s: readonly PlannedSession[]) => sum(s.map((x) => x.minutes));

function minutesByDate(sessions: readonly PlannedSession[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) out[s.date] = (out[s.date] ?? 0) + s.minutes;
  return out;
}

function minutesBySubject(sessions: readonly PlannedSession[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) out[s.subjectId] = (out[s.subjectId] ?? 0) + s.minutes;
  return out;
}

function expectWithinDailyLimit(sessions: readonly PlannedSession[], availability: WeeklyAvailability) {
  for (const [date, minutes] of Object.entries(minutesByDate(sessions))) {
    expect(minutes, `carga em ${date}`).toBeLessThanOrEqual(availability[weekdayOf(date)]);
  }
}

function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return e instanceof ScheduleError ? e.code : `UNEXPECTED:${String(e)}`;
  }
  return 'NO_ERROR';
}

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(deepFreeze);
    Object.freeze(obj);
  }
  return obj;
}

const subjects2 = [
  { id: 'a', weight: 1 },
  { id: 'b', weight: 1 },
];

const baseInput: GenerateInput = {
  startDate: '2024-02-01',
  examDate: '2024-03-01',
  weeklyAvailability: ALL_60,
  subjects: subjects2,
};

/* ------------------------------ datas ------------------------------ */

describe('dates', () => {
  test.each([
    ['2024-02-28', 1, '2024-02-29'], // bissexto
    ['2024-02-29', 1, '2024-03-01'],
    ['2023-02-28', 1, '2023-03-01'], // comum
    ['2000-02-28', 2, '2000-03-01'], // divisível por 400 -> bissexto
    ['2100-02-28', 1, '2100-03-01'], // divisível por 100 e não por 400 -> NÃO bissexto
    ['2024-12-31', 1, '2025-01-01'],
    ['2024-03-01', -1, '2024-02-29'],
  ])('addDays(%s, %i) = %s', (date, n, expected) => {
    expect(addDays(date, n)).toBe(expected);
  });

  test.each([
    ['2023-02-29'],
    ['2100-02-29'],
    ['2024-02-30'],
    ['2024-13-01'],
    ['2024-00-10'],
    ['24-01-01'],
    ['2024/01/01'],
  ])('rejeita data inválida %s', (date) => {
    expect(errorCode(() => toUTC(date))).toBe('INVALID_DATE');
  });

  test.each([
    ['2024-02-01', '2024-03-01', 29],
    ['2023-02-01', '2023-03-01', 28],
    ['2024-01-01', '2025-01-01', 366],
    ['2023-01-01', '2024-01-01', 365],
    ['2024-03-01', '2024-02-01', -29],
  ])('daysBetween(%s, %s) = %i', (a, b, expected) => {
    expect(daysBetween(a, b)).toBe(expected);
  });

  test.each([
    ['2024-02-29', 4], // quinta
    ['2023-03-01', 3], // quarta
    ['2000-01-01', 6], // sábado
  ])('weekdayOf(%s) = %i', (date, expected) => {
    expect(weekdayOf(date)).toBe(expected);
  });
});

/* ---------------------------- apportion ---------------------------- */

describe('apportion (maior resto)', () => {
  test.each([
    [100, [1, 1, 1], [34, 33, 33]],
    [10, [3, 2, 1], [5, 3, 2]],
    [7, [1, 0, 1], [4, 0, 3]],
    [0, [1, 2], [0, 0]],
    [5, [1], [5]],
  ])('apportion(%i, %j) = %j', (total, weights, expected) => {
    const result = apportion(total, weights);
    expect(result).toEqual(expected);
    if (total > 0) expect(sum(result)).toBe(total);
  });
});

/* ------------------------ gerador: horas/dias ----------------------- */

describe('generateSchedule – capacidade total (anos bissextos)', () => {
  test.each([
    ['fev/2024 (bissexto)', '2024-02-01', '2024-03-01', 29 * 60],
    ['fev/2023 (comum)', '2023-02-01', '2023-03-01', 28 * 60],
    ['fev/2000 (bissexto, múltiplo de 400)', '2000-02-01', '2000-03-01', 29 * 60],
    ['fev/2100 (NÃO bissexto)', '2100-02-01', '2100-03-01', 28 * 60],
    ['27/02→01/03 em 2024 (inclui 29/02)', '2024-02-27', '2024-03-01', 3 * 60],
    ['27/02→01/03 em 2023', '2023-02-27', '2023-03-01', 2 * 60],
    ['ano bissexto completo', '2024-01-01', '2025-01-01', 366 * 60],
    ['ano comum completo', '2023-01-01', '2024-01-01', 365 * 60],
  ])('%s', (_label, startDate, examDate, expectedMinutes) => {
    const plan = generateSchedule({ ...baseInput, startDate, examDate, utilization: 1 });
    expect(totalMinutes(plan)).toBe(expectedMinutes);
    expect(plan.every((s) => s.date >= startDate && s.date < examDate)).toBe(true);
  });

  test('29/02 recebe estudo em ano bissexto e nunca existe em ano comum', () => {
    const leap = generateSchedule({ ...baseInput, utilization: 1 });
    const common = generateSchedule({ ...baseInput, startDate: '2023-02-01', examDate: '2023-03-01', utilization: 1 });
    expect(leap.some((s) => s.date === '2024-02-29')).toBe(true);
    expect(common.some((s) => s.date.endsWith('-02-29'))).toBe(false);
  });

  test('nunca agenda no dia da prova', () => {
    const plan = generateSchedule({ ...baseInput, utilization: 1 });
    expect(plan.some((s) => s.date === '2024-03-01')).toBe(false);
  });
});

describe('generateSchedule – limites de carga horária', () => {
  test.each<[string, WeeklyAvailability, number]>([
    ['dias úteis curtos, fim de semana longo', [180, 60, 60, 60, 60, 60, 180], 30],
    ['só seg/qua/sex', [0, 90, 0, 90, 0, 90, 0], 30],
    ['granularidade que não divide o dia (45/25)', [45, 45, 45, 45, 45, 45, 45], 25],
    ['dias longos (600 min, bloco de 60)', [600, 600, 600, 600, 600, 600, 600], 60],
    ['um único dia da semana (domingo 24h)', [1440, 0, 0, 0, 0, 0, 0], 30],
  ])('%s', (_label, weeklyAvailability, granularityMinutes) => {
    const plan = generateSchedule({
      startDate: '2024-02-26',
      examDate: '2024-04-15', // atravessa o 29/02
      weeklyAvailability,
      subjects: [
        { id: 'a', weight: 5 },
        { id: 'b', weight: 3 },
        { id: 'c', weight: 2 },
      ],
      granularityMinutes,
      utilization: 1,
    });
    expectWithinDailyLimit(plan, weeklyAvailability);
    expect(plan.every((s) => s.minutes % granularityMinutes === 0 && s.minutes > 0)).toBe(true);
    const keys = plan.map((s) => `${s.date}|${s.subjectId}`);
    expect(new Set(keys).size).toBe(keys.length); // 1 sessão por matéria/dia
  });

  test.each([
    [0.5, 1800],
    [0.85, 3060],
    [1, 3600],
  ])('utilização %d reserva folga: %i minutos planejados', (utilization, expected) => {
    const plan = generateSchedule({ ...baseInput, startDate: '2024-01-01', examDate: '2024-03-01', utilization });
    expect(totalMinutes(plan)).toBe(expected); // 60 dias × 120 blocos de 30min = 120 blocos
  });
});

describe('generateSchedule – proporção por peso', () => {
  // 2024-01-01 → 2024-03-01 = 60 dias (31 + 29) × 120 min = 7200 min
  test.each<[number[], number[]]>([
    [[3, 2, 1], [3600, 2400, 1200]],
    [[5, 3, 2], [3600, 2160, 1440]],
    [[1, 1, 1], [2400, 2400, 2400]],
  ])('pesos %j', (weights, expected) => {
    const ids = weights.map((_, i) => `s${i}`);
    const plan = generateSchedule({
      startDate: '2024-01-01',
      examDate: '2024-03-01',
      weeklyAvailability: ALL_120,
      subjects: weights.map((weight, i) => ({ id: ids[i], weight })),
      utilization: 1,
    });
    const bySubject = minutesBySubject(plan);
    expect(ids.map((id) => bySubject[id])).toEqual(expected);
    expect(totalMinutes(plan)).toBe(7200);
  });

  test('resto da divisão vai para a matéria de maior fração, sem perder blocos', () => {
    // 50 dias × 2 blocos = 100 blocos / 3 matérias iguais = 34/33/33
    const plan = generateSchedule({
      startDate: '2024-01-01',
      examDate: '2024-02-20',
      weeklyAvailability: ALL_60,
      subjects: [
        { id: 'a', weight: 1 },
        { id: 'b', weight: 1 },
        { id: 'c', weight: 1 },
      ],
      utilization: 1,
    });
    expect(minutesBySubject(plan)).toEqual({ a: 1020, b: 990, c: 990 });
  });

  test('intercala as matérias em vez de concentrar uma por dia', () => {
    const plan = generateSchedule({ ...baseInput, weeklyAvailability: ALL_120, utilization: 1 });
    const firstDay = plan.filter((s) => s.date === '2024-02-01');
    expect(firstDay.map((s) => s.subjectId).sort()).toEqual(['a', 'b']);
    expect(firstDay.every((s) => s.minutes === 60)).toBe(true);
  });

  test('é determinística', () => {
    expect(generateSchedule(baseInput)).toEqual(generateSchedule(baseInput));
  });
});

describe('generateSchedule – validações', () => {
  test.each<[string, Partial<GenerateInput>, string]>([
    ['prova no mesmo dia do início', { examDate: '2024-02-01' }, 'EXAM_NOT_AFTER_START'],
    ['prova antes do início', { examDate: '2024-01-15' }, 'EXAM_NOT_AFTER_START'],
    ['29/02 em ano comum', { startDate: '2023-02-29' }, 'INVALID_DATE'],
    ['sem matérias', { subjects: [] }, 'INVALID_SUBJECTS'],
    ['peso zero', { subjects: [{ id: 'a', weight: 0 }] }, 'INVALID_SUBJECTS'],
    ['matérias duplicadas', { subjects: [{ id: 'a', weight: 1 }, { id: 'a', weight: 2 }] }, 'INVALID_SUBJECTS'],
    ['disponibilidade com 6 dias', { weeklyAvailability: [60, 60, 60, 60, 60, 60] }, 'INVALID_AVAILABILITY'],
    ['minutos negativos', { weeklyAvailability: [60, -1, 60, 60, 60, 60, 60] }, 'INVALID_AVAILABILITY'],
    ['mais de 24h no dia', { weeklyAvailability: [1441, 0, 0, 0, 0, 0, 0] }, 'INVALID_AVAILABILITY'],
    ['sem nenhuma hora disponível', { weeklyAvailability: [0, 0, 0, 0, 0, 0, 0] }, 'NO_AVAILABLE_TIME'],
    ['granularidade zero', { granularityMinutes: 0 }, 'INVALID_GRANULARITY'],
    ['utilização > 1', { utilization: 1.5 }, 'INVALID_UTILIZATION'],
    ['utilização 0', { utilization: 0 }, 'INVALID_UTILIZATION'],
  ])('%s → %s', (_label, override, code) => {
    expect(errorCode(() => generateSchedule({ ...baseInput, ...override }))).toBe(code);
  });
});

/* ---------------------- recálculo: cenário real --------------------- */

const AV: WeeklyAvailability = [60, 120, 120, 120, 120, 120, 60]; // dom..sáb
const EXAM = '2024-03-04'; // segunda; plano: 26/02 (seg) → 03/03 (dom), atravessa 29/02

function buildPlan(): PlannedSession[] {
  return generateSchedule({
    startDate: '2024-02-26',
    examDate: EXAM,
    weeklyAvailability: AV,
    subjects: [
      { id: 'port', weight: 3 },
      { id: 'mat', weight: 2 },
      { id: 'dir', weight: 1 },
    ],
    utilization: 0.75,
  });
}

describe('recalculateSchedule – botão "Imprevisto"', () => {
  test.each(['asap', 'balanced'] as const)('terça perdida, redistribui sem estourar o limite (%s)', (strategy) => {
    const plan = buildPlan().map((s) => ({ ...s, completed: s.date === '2024-02-26' })); // só segunda feita
    const tuesday = plan.filter((s) => s.date === '2024-02-27');
    const result = recalculateSchedule({
      sessions: plan,
      fromDate: '2024-02-28',
      examDate: EXAM,
      weeklyAvailability: AV,
      strategy,
    });

    expect(result.feasible).toBe(true);
    expect(result.unallocated).toEqual([]);
    expect(sum(result.moved.map((m) => m.minutes))).toBe(totalMinutes(tuesday));
    // conservação de carga e de progresso
    expect(totalMinutes(result.sessions)).toBe(totalMinutes(plan));
    expect(calculateProgress(result.sessions).percent).toBe(calculateProgress(plan).percent);
    // nada pendente no passado, nada na prova
    expect(result.sessions.filter((s) => !s.completed && s.date < '2024-02-28')).toEqual([]);
    expect(result.sessions.some((s) => s.date >= EXAM)).toBe(false);
    // segunda concluída preservada
    expect(result.sessions.filter((s) => s.completed)).toEqual(plan.filter((s) => s.completed));
    // limite diário
    expectWithinDailyLimit(result.sessions, AV);
    // matéria por matéria, a carga se mantém
    expect(minutesBySubject(result.sessions)).toEqual(minutesBySubject(plan));
  });

  test('sobrecarga: atraso maior que a folga → devolve excedente e NUNCA estoura o limite', () => {
    const plan = buildPlan(); // nada concluído
    const result = recalculateSchedule({
      sessions: plan,
      fromDate: '2024-03-03', // só sobra o último dia
      examDate: EXAM,
      weeklyAvailability: AV,
    });
    const placed = totalMinutes(result.sessions.filter((s) => s.rescheduled));
    const unallocated = sum(result.unallocated.map((u) => u.minutes));

    expect(result.feasible).toBe(false);
    expect(unallocated).toBeGreaterThan(0);
    expect(placed + unallocated).toBe(sum(result.moved.map((m) => m.minutes)));
    expectWithinDailyLimit(result.sessions, AV);
  });

  test.each(['2024-03-04', '2024-03-10'])('fromDate %s (prova já chegou/passou) → nada é re-alocado', (fromDate) => {
    const plan = buildPlan();
    const result = recalculateSchedule({ sessions: plan, fromDate, examDate: EXAM, weeklyAvailability: AV });
    expect(result.feasible).toBe(false);
    expect(result.sessions.some((s) => s.rescheduled)).toBe(false);
    expect(sum(result.unallocated.map((u) => u.minutes))).toBe(totalMinutes(plan));
  });

  test('é idempotente: recalcular de novo com a mesma data não muda nada', () => {
    const plan = buildPlan().map((s) => ({ ...s, completed: s.date === '2024-02-26' }));
    const args = { fromDate: '2024-02-28', examDate: EXAM, weeklyAvailability: AV } as const;
    const first = recalculateSchedule({ sessions: plan, ...args });
    const second = recalculateSchedule({ sessions: first.sessions, ...args });
    expect(second.moved).toEqual([]);
    expect(second.sessions).toEqual(first.sessions);
  });

  test('não muta a entrada', () => {
    const plan = deepFreeze(buildPlan());
    expect(() =>
      recalculateSchedule({ sessions: plan, fromDate: '2024-02-28', examDate: EXAM, weeklyAvailability: AV }),
    ).not.toThrow();
  });
});

/* ------------------ recálculo: estratégias e limites ----------------- */

function backlog(date: string, minutes: number, subjectId = 'a'): PlannedSession {
  return { date, subjectId, minutes, completed: false };
}

const rescheduledByDate = (sessions: readonly PlannedSession[]) =>
  minutesByDate(sessions.filter((s) => s.rescheduled));

describe('recalculateSchedule – estratégias', () => {
  test.each<['asap' | 'balanced', Record<string, number>]>([
    ['asap', { '2024-02-28': 120 }],
    ['balanced', { '2024-02-28': 30, '2024-02-29': 30, '2024-03-01': 30, '2024-03-02': 30 }],
  ])('120 min atrasados com 5 dias livres → %s', (strategy, expected) => {
    const result = recalculateSchedule({
      sessions: [backlog('2024-02-27', 120)],
      fromDate: '2024-02-28',
      examDate: '2024-03-04',
      weeklyAvailability: ALL_120,
      strategy,
    });
    expect(rescheduledByDate(result.sessions)).toEqual(expected);
    expect(result.feasible).toBe(true);
  });

  test('bloco final menor que a granularidade é preservado (45 min com blocos de 30)', () => {
    const result = recalculateSchedule({
      sessions: [backlog('2024-02-28', 45)],
      fromDate: '2024-02-29',
      examDate: '2024-03-03',
      weeklyAvailability: ALL_120,
      strategy: 'asap',
    });
    expect(rescheduledByDate(result.sessions)).toEqual({ '2024-02-29': 45 });
  });
});

describe('recalculateSchedule – virada de fevereiro (anos bissextos)', () => {
  test.each([
    ['2024: 28/02 perdido → cai em 29/02', '2024-02-28', '2024-02-29', '2024-03-02', '2024-02-29'],
    ['2023: 28/02 perdido → pula direto p/ 01/03', '2023-02-28', '2023-03-01', '2023-03-03', '2023-03-01'],
    ['2100 (não bissexto): idem 2023', '2100-02-28', '2100-03-01', '2100-03-04', '2100-03-01'],
    ['2024: 29/02 perdido → 01/03', '2024-02-29', '2024-03-01', '2024-03-03', '2024-03-01'],
  ])('%s', (_label, missedDate, fromDate, examDate, expectedDate) => {
    const result = recalculateSchedule({
      sessions: [backlog(missedDate, 60)],
      fromDate,
      examDate,
      weeklyAvailability: ALL_120,
      strategy: 'asap',
    });
    expect(rescheduledByDate(result.sessions)).toEqual({ [expectedDate]: 60 });
  });
});

describe('recalculateSchedule – limites exatos de carga diária', () => {
  // Cap = 120/dia. 29/02/2024 já tem (120 - folga) agendados; 60 min atrasados (2 blocos de 30).
  test.each<[number, Record<string, number>]>([
    [120, { '2024-02-29': 60 }], // dia vazio: cabe tudo
    [60, { '2024-02-29': 60 }], // folga exata de 60: cabe tudo, atinge o limite
    [30, { '2024-02-29': 30, '2024-03-01': 30 }], // cabe 1 bloco, o outro vai pro dia seguinte
    [29, { '2024-03-01': 60 }], // 29 min < 1 bloco: não pode usar o dia
    [0, { '2024-03-01': 60 }], // dia já no limite
  ])('folga de %i min em 29/02', (freeMinutes, expected) => {
    const existing: PlannedSession[] = [];
    if (freeMinutes < 120) {
      existing.push({ date: '2024-02-29', subjectId: 'b', minutes: 120 - freeMinutes, completed: false });
    }
    const result = recalculateSchedule({
      sessions: [backlog('2024-02-28', 60), ...existing],
      fromDate: '2024-02-29',
      examDate: '2024-03-03',
      weeklyAvailability: ALL_120,
      strategy: 'asap',
    });
    expect(rescheduledByDate(result.sessions)).toEqual(expected);
    expectWithinDailyLimit(result.sessions, ALL_120);
    expect(result.feasible).toBe(true);
  });

  test('dia já acima do limite (ex.: usuário reduziu a disponibilidade) não recebe carga e não quebra', () => {
    const result = recalculateSchedule({
      sessions: [backlog('2024-02-28', 30), { date: '2024-02-29', subjectId: 'b', minutes: 200, completed: false }],
      fromDate: '2024-02-29',
      examDate: '2024-03-03',
      weeklyAvailability: ALL_120,
      strategy: 'asap',
    });
    expect(rescheduledByDate(result.sessions)).toEqual({ '2024-03-01': 30 });
  });
});

/* ------------------------------ progresso ---------------------------- */

describe('calculateProgress', () => {
  const s = (minutes: number, completed: boolean, subjectId = 'a') => ({ subjectId, minutes, completed });

  test.each<[string, ReturnType<typeof s>[], number]>([
    ['plano vazio', [], 0],
    ['tudo concluído', [s(60, true)], 100],
    ['nada concluído', [s(60, false)], 0],
    ['metade', [s(30, true), s(30, false)], 50],
    ['um terço (arredonda a 1 casa)', [s(60, true), s(120, false)], 33.3],
    ['pondera por minutos, não por sessões', [s(10, true), s(90, false), s(0, false)], 10],
  ])('%s → %d%%', (_label, sessions, expected) => {
    expect(calculateProgress(sessions).percent).toBe(expected);
  });

  test('agrupa por matéria', () => {
    const p = calculateProgress([s(60, true, 'port'), s(60, false, 'port'), s(30, true, 'mat')]);
    expect(p.bySubject.port).toEqual({ totalMinutes: 120, completedMinutes: 60, percent: 50 });
    expect(p.bySubject.mat.percent).toBe(100);
  });
});

/* -------------------------------- ritmo -------------------------------- */

describe('computePace', () => {
  const base = { startDate: '2026-01-01', examDate: '2026-01-31', totalMinutes: 1000 };

  test.each<[string, Partial<typeof base> & { today: string; completedMinutes: number }, PaceStatus]>([
    ['metade do prazo, metade feito → no ritmo', { today: '2026-01-16', completedMinutes: 500 }, 'on_track'],
    ['metade do prazo, tudo feito → adiantado', { today: '2026-01-16', completedMinutes: 1000 }, 'done'],
    ['metade do prazo, nada feito → atrasado', { today: '2026-01-16', completedMinutes: 0 }, 'behind'],
    ['metade do prazo, 60% feito → adiantado', { today: '2026-01-16', completedMinutes: 600 }, 'ahead'],
    ['hoje é o início → ainda não começou a contar', { today: '2026-01-01', completedMinutes: 0 }, 'not_started'],
    ['prova já virou a data → prazo esgotado', { today: '2026-02-05', completedMinutes: 500 }, 'finished'],
    ['100% concluído antes da prova → concluído', { today: '2026-01-10', completedMinutes: 1000 }, 'done'],
  ])('%s', (_label, over, expected) => {
    const pace = computePace({ ...base, ...over });
    expect(pace.status).toBe(expected);
  });

  test('plano sem minutos planejados não quebra', () => {
    expect(computePace({ ...base, totalMinutes: 0, today: '2026-01-16', completedMinutes: 0 }).status).toBe('not_started');
  });

  test('é determinístico e nunca aponta 2 pessoas uma contra a outra (só compara com o próprio ritmo)', () => {
    const a = computePace({ ...base, today: '2026-01-16', completedMinutes: 700 });
    const b = computePace({ ...base, today: '2026-01-16', completedMinutes: 700 });
    expect(a).toEqual(b);
    expect(a.daysDelta).toBeGreaterThan(0);
  });

  test('dias de folga aproximados: 20% adiantado num plano de 30 dias ≈ 6 dias', () => {
    const pace = computePace({ ...base, today: '2026-01-16', completedMinutes: 700 }); // 70% feito, 50% esperado
    expect(pace.daysDelta).toBe(6);
  });
});

/* --------------------------- revisão espaçada --------------------------- */

describe('scheduleReviews (método 24h / 7d / 30d)', () => {
  const AV_ALL_120: WeeklyAvailability = [120, 120, 120, 120, 120, 120, 120];

  test('agenda as 3 revisões nas datas ideais quando há espaço livre', () => {
    const out = scheduleReviews({
      seed: { subjectId: 'port', studiedOn: '2026-02-01', originalMinutes: 60 },
      examDate: '2026-06-01',
      weeklyAvailability: AV_ALL_120,
      loadByDate: new Map(),
    });
    expect(out.map((r) => [r.offsetDays, r.date])).toEqual([
      [1, '2026-02-02'],
      [7, '2026-02-08'],
      [30, '2026-03-03'],
    ]);
    expect(out.every((r) => r.minutes === 30)).toBe(true); // 40% de 60min, arredondado ao bloco de 30
  });

  test('revisão cujo dia ideal cai na virada de fevereiro bissexto', () => {
    const out = scheduleReviews({
      seed: { subjectId: 'a', studiedOn: '2024-02-27', originalMinutes: 60 },
      examDate: '2024-06-01',
      weeklyAvailability: AV_ALL_120,
      loadByDate: new Map(),
    });
    expect(out.find((r) => r.offsetDays === 1)?.date).toBe('2024-02-28');
    expect(out.find((r) => r.offsetDays === 7)?.date).toBe('2024-03-05'); // atravessa o 29/02
  });

  test.each([
    ['revisão de 30 dias não cabe mais → é omitida, não empurrada para depois da prova', '2026-02-01', '2026-02-20', [1, 7]],
    ['todas as revisões caem depois da prova → nenhuma é agendada', '2026-02-01', '2026-02-02', []],
  ])('%s', (_label, studiedOn, examDate, expectedOffsets) => {
    const out = scheduleReviews({
      seed: { subjectId: 'a', studiedOn, originalMinutes: 60 },
      examDate,
      weeklyAvailability: AV_ALL_120,
      loadByDate: new Map(),
    });
    expect(out.map((r) => r.offsetDays)).toEqual(expectedOffsets);
  });

  test('nunca estoura o limite diário: empurra para o primeiro dia com folga', () => {
    const loadByDate = new Map([['2026-02-02', 120]]); // dia da 1ª revisão já lotado
    const out = scheduleReviews({
      seed: { subjectId: 'a', studiedOn: '2026-02-01', originalMinutes: 60 },
      examDate: '2026-06-01',
      weeklyAvailability: AV_ALL_120,
      loadByDate,
    });
    expect(out.find((r) => r.offsetDays === 1)?.date).toBe('2026-02-03');
  });

  test('sem espaço algum até a prova: a revisão é omitida (nunca estoura)', () => {
    const loadByDate = new Map(['2026-02-02', '2026-02-03', '2026-02-04'].map((d) => [d, 120]));
    const out = scheduleReviews({
      seed: { subjectId: 'a', studiedOn: '2026-02-01', originalMinutes: 60 },
      examDate: '2026-02-05',
      weeklyAvailability: AV_ALL_120,
      loadByDate,
    });
    expect(out.find((r) => r.offsetDays === 1)).toBeUndefined();
  });

  test('duração mínima de uma revisão é sempre 1 bloco, mesmo para sessões curtas', () => {
    const out = scheduleReviews({
      seed: { subjectId: 'a', studiedOn: '2026-02-01', originalMinutes: 30 },
      examDate: '2026-06-01',
      weeklyAvailability: AV_ALL_120,
      loadByDate: new Map(),
      granularityMinutes: 30,
    });
    expect(out.every((r) => r.minutes >= 30)).toBe(true);
  });

  test('é determinístico', () => {
    const args = {
      seed: { subjectId: 'a', studiedOn: '2026-02-01', originalMinutes: 60 },
      examDate: '2026-06-01',
      weeklyAvailability: AV_ALL_120,
      loadByDate: new Map(),
    };
    expect(scheduleReviews(args)).toEqual(scheduleReviews(args));
  });

  test('regressão: duas revisões da MESMA sessão nunca estouram o limite do dia juntas', () => {
    // Só um único dia em toda a janela tem espaço (40 min livres de uma capacidade de 50);
    // offset=1 e offset=7 caem no mesmo dia-alvo se a carga não for atualizada entre as duas.
    const weekly: WeeklyAvailability = [50, 50, 50, 50, 50, 50, 50];
    const onlyFreeDay = '2026-02-08'; // = studiedOn + 7 (mesmo "dia ideal" das duas revisões coincide após a busca)
    const loadByDate = new Map<string, number>();
    for (const d of listDays('2026-02-02', '2026-05-31')) loadByDate.set(d, d === onlyFreeDay ? 10 : 50);

    const out = scheduleReviews({
      seed: { subjectId: 'a', studiedOn: '2026-02-01', originalMinutes: 100 }, // revisão = 40min
      examDate: '2026-06-01',
      weeklyAvailability: weekly,
      loadByDate,
    });

    const perDay = new Map<string, number>();
    for (const r of out) perDay.set(r.date, (perDay.get(r.date) ?? 0) + r.minutes);
    for (const [date, minutes] of perDay) {
      const used = loadByDate.get(date) ?? 0;
      expect(used + minutes, date).toBeLessThanOrEqual(weekly[weekdayOf(date)]);
    }
    // No máximo uma das duas revisões coube no único dia livre; a outra foi omitida.
    expect(out.filter((r) => r.date === onlyFreeDay)).toHaveLength(1);
  });
});

/* ---------------------- generateSchedule – limite de matérias por dia ---------------------- */

describe('generateSchedule – limite de matérias por dia (maxSubjectsPerDay)', () => {
  function subjectsPerDay(plan: ReturnType<typeof generateSchedule>): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    for (const s of plan) {
      if (!map.has(s.date)) map.set(s.date, new Set());
      map.get(s.date)!.add(s.subjectId);
    }
    return map;
  }

  const manySubjects = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, weight: 1 + (i % 3) }));
  // Folga REALISTA (a mesma que o produto usa de verdade — createPlan nunca passa utilization:1).
  // Com folga de verdade, o limite de matérias por dia nunca precisa ser violado.
  const realistic = { startDate: '2026-01-01', examDate: '2026-04-01', weeklyAvailability: ALL_120, subjects: manySubjects };

  test('sem o limite (padrão), um dia pode ter mais matérias que o limite que seria usado', () => {
    const plan = generateSchedule(realistic);
    const perDay = subjectsPerDay(plan);
    const maxFound = Math.max(...[...perDay.values()].map((s) => s.size));
    expect(maxFound).toBeGreaterThan(3); // confirma que, sem limite, o dia realmente mistura muitas matérias
  });

  test.each([1, 2, 3, 4])('com folga realista e limite de %i, nenhum dia tem mais que isso de matérias diferentes', (limit) => {
    const plan = generateSchedule({ ...realistic, maxSubjectsPerDay: limit });
    const perDay = subjectsPerDay(plan);
    for (const [date, set] of perDay) expect(set.size, date).toBeLessThanOrEqual(limit);
  });

  test('limite maior ou igual ao nº de matérias se comporta como sem limite', () => {
    const shortWindow = { ...realistic, examDate: '2026-02-15' };
    const unlimited = generateSchedule(shortWindow);
    const withBigLimit = generateSchedule({ ...shortWindow, maxSubjectsPerDay: manySubjects.length });
    expect(withBigLimit).toEqual(unlimited);
  });

  test('a soma de minutos por matéria no total do plano não muda com o limite (só muda QUANDO)', () => {
    const unlimited = generateSchedule(realistic);
    const limited = generateSchedule({ ...realistic, maxSubjectsPerDay: 2 });
    const totals = (plan: typeof unlimited) => {
      const m = new Map<string, number>();
      for (const s of plan) m.set(s.subjectId, (m.get(s.subjectId) ?? 0) + s.minutes);
      return m;
    };
    expect(totals(limited)).toEqual(totals(unlimited));
  });

  test('continua sem estourar o limite diário de horas', () => {
    const plan = generateSchedule({ ...realistic, weeklyAvailability: ALL_60, maxSubjectsPerDay: 2 });
    expectWithinDailyLimit(plan, ALL_60);
  });

  test('limite de 1 matéria por dia: cada dia estuda só uma matéria (blocos fechados)', () => {
    const plan = generateSchedule({
      startDate: '2026-01-01', examDate: '2026-02-01', weeklyAvailability: ALL_120,
      subjects: [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }, { id: 'c', weight: 1 }],
      maxSubjectsPerDay: 1,
    });
    const perDay = subjectsPerDay(plan);
    expect([...perDay.values()].every((s) => s.size === 1)).toBe(true);
  });

  test.each([
    ['zero', 0],
    ['negativo', -1],
    ['decimal', 2.5],
  ])('rejeita maxSubjectsPerDay inválido: %s', (_label, value) => {
    expect(
      errorCode(() => generateSchedule({ ...baseInput, maxSubjectsPerDay: value })),
    ).toBe('INVALID_MAX_SUBJECTS_PER_DAY');
  });

  test('é determinístico', () => {
    const args = { ...realistic, maxSubjectsPerDay: 3 };
    expect(generateSchedule(args)).toEqual(generateSchedule(args));
  });

  describe('caso extremo: utilization 1 (zero folga) com limite apertado', () => {
    // Sem NENHUMA folga, pode sobrar um resto de minutos sem outro dia livre para caber dentro
    // do limite. A escolha deliberada é: nunca perder minutos de estudo (invariante inegociável),
    // mesmo que isso signifique, raramente, um dia específico passar do limite combinado.
    const tight = { ...realistic, utilization: 1 as const };

    test('nunca perde minutos de estudo, mesmo sem folga nenhuma', () => {
      const unlimited = generateSchedule(tight);
      const limited = generateSchedule({ ...tight, maxSubjectsPerDay: 2 });
      const total = (plan: typeof unlimited) => plan.reduce((a, s) => a + s.minutes, 0);
      expect(total(limited)).toBe(total(unlimited)); // nenhum minuto perdido
    });

    test('mesmo nesse caso extremo, nunca estoura o limite diário de HORAS (só, no pior caso, o de matérias)', () => {
      const plan = generateSchedule({ ...tight, maxSubjectsPerDay: 2 });
      expectWithinDailyLimit(plan, ALL_120);
    });

    test('a folga padrão do produto (não 1) evita esse caso na prática', () => {
      // createPlan (server/services/plan.service.ts) nunca passa utilization — usa sempre o
      // padrão (0.85), então este teste documenta que, nas condições reais de uso, o limite de
      // matérias por dia é sempre respeitado à risca.
      const plan = generateSchedule({ ...realistic, maxSubjectsPerDay: 2 }); // sem utilization: 1
      const perDay = subjectsPerDay(plan);
      expect([...perDay.values()].every((s) => s.size <= 2)).toBe(true);
    });
  });
});
