import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import * as schema from '../db/schema';

/**
 * Testes de integração: serviços REAIS rodando contra um Postgres de verdade (PGlite, em memória),
 * com as migrations geradas pelo Drizzle. Só o client do Neon é trocado.
 */
const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('server-only', () => ({}));
vi.mock('../db/client', () => ({ getDb: () => holder.db }));

type TestDb = ReturnType<typeof drizzle<typeof schema>>;
let db: TestDb;
let client: PGlite;

beforeAll(async () => {
  client = new PGlite();
  for (const file of readdirSync('drizzle').filter((f) => f.endsWith('.sql')).sort()) {
    for (const stmt of readFileSync(`drizzle/${file}`, 'utf8').split('--> statement-breakpoint')) await client.exec(stmt);
  }
  db = drizzle(client, { schema });
  holder.db = db;
});
afterAll(async () => {
  vi.useRealTimers();
  await client.close();
});

let n = 0;
async function newUser(overrides: Partial<typeof schema.users.$inferInsert> = {}) {
  const { hashPassword } = await import('@/lib/auth');
  const [u] = await db
    .insert(schema.users)
    .values({ email: `u${++n}@teste.com`, name: 'Maria Souza', passwordHash: await hashPassword('senhaAntiga1'), ...overrides })
    .returning();
  return u;
}

describe('recuperação de senha', () => {
  test('e-mail desconhecido não cria token (e não vaza se existe)', async () => {
    const { requestPasswordReset } = await import('../services/password-reset.service');
    await requestPasswordReset('nao-existe@teste.com');
    expect(await db.select().from(schema.passwordResetTokens)).toHaveLength(0);
  });

  test('fluxo completo: o link enviado casa com o hash guardado; uso único; troca de senha registrada', async () => {
    const { requestPasswordReset, resetPassword } = await import('../services/password-reset.service');
    const { hashToken } = await import('@/core/security/tokens');
    const { verifyPassword } = await import('@/lib/auth');
    const u = await newUser();

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await requestPasswordReset(u.email);
    const printed = log.mock.calls.flat().join('\n');
    log.mockRestore();
    const token = /token=([\w-]+)/.exec(printed)?.[1];
    expect(token, 'link com token no e-mail').toBeTruthy();

    const [row] = await db.select().from(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.userId, u.id));
    expect(row.tokenHash).toBe(hashToken(token!));
    expect(row.tokenHash).not.toContain(token!); // só o hash fica no banco

    expect(await resetPassword(token!, 'senhaNova123')).toBe('ok');
    const [after] = await db.select().from(schema.users).where(eq(schema.users.id, u.id));
    expect(await verifyPassword('senhaNova123', after.passwordHash)).toBe(true);
    expect(await verifyPassword('senhaAntiga1', after.passwordHash)).toBe(false);
    expect(after.passwordChangedAt).toBeInstanceOf(Date);

    expect(await resetPassword(token!, 'outraSenha456')).toBe('invalid'); // não reutiliza
  });

  test('duas requisições simultâneas com o mesmo token: só uma vence', async () => {
    const { resetPassword } = await import('../services/password-reset.service');
    const { generateToken } = await import('@/core/security/tokens');
    const u = await newUser();
    const { token, hash } = generateToken();
    await db.insert(schema.passwordResetTokens).values({ userId: u.id, tokenHash: hash, expiresAt: new Date(Date.now() + 60_000) });
    const results = await Promise.all([resetPassword(token, 'senhaNova123'), resetPassword(token, 'senhaNova456')]);
    expect(results.filter((r) => r === 'ok')).toHaveLength(1);
  });

  test.each([
    ['token expirado', (d: Date) => new Date(d.getTime() - 1000)],
  ])('%s é recusado', async (_l, expires) => {
    const { resetPassword } = await import('../services/password-reset.service');
    const { generateToken } = await import('@/core/security/tokens');
    const u = await newUser();
    const { token, hash } = generateToken();
    await db.insert(schema.passwordResetTokens).values({ userId: u.id, tokenHash: hash, expiresAt: expires(new Date()) });
    expect(await resetPassword(token, 'senhaNova123')).toBe('invalid');
  });

  test('token inexistente é recusado; novo pedido invalida os links anteriores após o uso', async () => {
    const { resetPassword } = await import('../services/password-reset.service');
    const { generateToken } = await import('@/core/security/tokens');
    expect(await resetPassword('lixo', 'senhaNova123')).toBe('invalid');

    const u = await newUser();
    const a = generateToken();
    const b = generateToken();
    for (const t of [a, b]) {
      await db.insert(schema.passwordResetTokens).values({ userId: u.id, tokenHash: t.hash, expiresAt: new Date(Date.now() + 60_000) });
    }
    expect(await resetPassword(a.token, 'senhaNova123')).toBe('ok');
    expect(await resetPassword(b.token, 'senhaNova999')).toBe('invalid'); // o outro link morreu junto
  });
});

describe('LGPD: exportar e excluir conta', () => {
  async function seed() {
    const { createPlan } = await import('../services/plan.service');
    const u = await newUser();
    const planId = await createPlan(u.id, {
      name: 'PF 2027',
      startDate: '2026-10-13',
      examDate: '2027-01-15',
      subjects: [
        { name: 'Português', weight: 3 },
        { name: 'Direito', weight: 2 },
      ],
      availabilityMinutes: [60, 120, 120, 120, 120, 120, 180],
    });
    await db.insert(schema.payments).values({
      userId: u.id, planId, provider: 'mercadopago', providerPaymentId: `mp-${u.id}`, amountCents: 5990, status: 'approved',
      pixQrCode: 'SEGREDO-QR', pixQrBase64: 'SEGREDO-B64',
    });
    await db.insert(schema.subscriptions).values({ userId: u.id, providerSubscriptionId: `sub_${u.id}`, status: 'canceled' });
    return { u, planId };
  }

  test('exportação traz os dados do titular e não vaza QR do Pix', async () => {
    const { exportUserData } = await import('../services/account.service');
    const { u } = await seed();
    const data = await exportUserData(u.id);
    expect(data?.conta.email).toBe(u.email);
    expect(data?.planos[0].materias).toHaveLength(2);
    expect(data?.planos[0].sessoes.length).toBeGreaterThan(0);
    expect(data?.pagamentos[0].amountCents).toBe(5990);
    expect(JSON.stringify(data)).not.toContain('SEGREDO');
  });

  test('exclusão apaga dados de estudo, anonimiza a conta e preserva o registro fiscal', async () => {
    const { deleteAccount } = await import('../services/account.service');
    const { verifyPassword } = await import('@/lib/auth');
    const { u, planId } = await seed();

    await deleteAccount(u.id);

    expect(await db.select().from(schema.studyPlans).where(eq(schema.studyPlans.userId, u.id))).toHaveLength(0);
    expect(await db.select().from(schema.studySessions).where(eq(schema.studySessions.planId, planId))).toHaveLength(0);
    expect(await db.select().from(schema.subjects).where(eq(schema.subjects.planId, planId))).toHaveLength(0);
    expect(await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, u.id))).toHaveLength(0);

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, u.id));
    expect(user.email).toBe(`excluido-${u.id}@aprovasync.invalid`);
    expect(user.name).toBeNull();
    expect(await verifyPassword('senhaAntiga1', user.passwordHash)).toBe(false);
    expect(await db.select().from(schema.users).where(eq(schema.users.email, u.email))).toHaveLength(0); // e-mail liberado

    const [pay] = await db.select().from(schema.payments).where(eq(schema.payments.userId, u.id));
    expect(pay.amountCents).toBe(5990); // guarda fiscal mantida
    expect(pay.planId).toBeNull();
  });
});

describe('Imprevisto (persistência real)', () => {
  afterAll(() => vi.useRealTimers());

  test('move atraso, respeita limite diário, conserva horas e registra o ajuste', async () => {
    const { createPlan } = await import('../services/plan.service');
    const { reportSetback } = await import('../services/adjustment.service');
    const { weekdayOf } = await import('@/core/schedule');
    const avail = [60, 120, 120, 120, 120, 120, 180];
    const u = await newUser();

    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-13T15:00:00Z') });
    const planId = await createPlan(u.id, {
      name: 'ENEM', startDate: '2026-10-13', examDate: '2026-11-20',
      subjects: [{ name: 'Matemática', weight: 3 }, { name: 'Redação', weight: 1 }],
      availabilityMinutes: avail,
    });
    const total = async () =>
      (await db.select().from(schema.studySessions).where(and(eq(schema.studySessions.planId, planId), eq(schema.studySessions.status, 'pending'))))
        .reduce((a, s) => a + s.minutes, 0);
    const before = await total();

    vi.setSystemTime(new Date('2026-10-16T15:00:00Z')); // 3 dias sem estudar
    const out = await reportSetback(u.id, planId, 'behind');
    expect(out.status).toBe('ok');
    expect(out.movedMinutes).toBeGreaterThan(0);

    const rows = await db.select().from(schema.studySessions).where(eq(schema.studySessions.planId, planId));
    const pending = rows.filter((r) => r.status === 'pending');
    expect(pending.some((r) => r.date < '2026-10-16')).toBe(false); // nada pendente no passado
    expect(rows.filter((r) => r.status === 'skipped').length).toBeGreaterThan(0);
    expect(pending.filter((r) => r.origin === 'rescheduled').length).toBeGreaterThan(0);
    expect(await total()).toBe(before); // nenhuma hora perdida

    const perDay = new Map<string, number>();
    for (const r of pending) perDay.set(r.date, (perDay.get(r.date) ?? 0) + r.minutes);
    for (const [date, minutes] of perDay) expect(minutes, date).toBeLessThanOrEqual(avail[weekdayOf(date)]);

    const adj = await db.select().from(schema.planAdjustments).where(eq(schema.planAdjustments.planId, planId));
    expect(adj).toHaveLength(1);
    expect(adj[0].movedMinutes).toBe(out.movedMinutes);

    // segunda chamada: já está tudo em dia
    expect((await reportSetback(u.id, planId, 'behind')).status).toBe('nothing');
  });

  test('sem espaço até a prova: não altera nada e avisa quanto falta', async () => {
    const { createPlan } = await import('../services/plan.service');
    const { reportSetback } = await import('../services/adjustment.service');
    const u = await newUser();

    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-13T15:00:00Z') });
    const planId = await createPlan(u.id, {
      name: 'Curto', startDate: '2026-10-13', examDate: '2026-10-21',
      subjects: [{ name: 'Única', weight: 1 }], availabilityMinutes: [60, 60, 60, 60, 60, 60, 60],
    });
    const snapshot = JSON.stringify((await db.select().from(schema.studySessions).where(eq(schema.studySessions.planId, planId))).map((r) => [r.id, r.status]).sort());

    vi.setSystemTime(new Date('2026-10-20T15:00:00Z')); // véspera da prova, 7 dias de atraso
    const out = await reportSetback(u.id, planId, 'behind');
    expect(out.status).toBe('no_room');
    expect(out.unallocatedMinutes).toBeGreaterThan(0);

    const after = JSON.stringify((await db.select().from(schema.studySessions).where(eq(schema.studySessions.planId, planId))).map((r) => [r.id, r.status]).sort());
    expect(after).toBe(snapshot); // nada mudou
  });
});

describe('Revisão espaçada (persistência real)', () => {
  afterAll(() => vi.useRealTimers());

  test('ao concluir uma sessão, agenda revisões de 24h/7d/30d sem duplicar', async () => {
    const { createPlan } = await import('../services/plan.service');
    const { scheduleReviewsForSession } = await import('../services/review.service');
    const u = await newUser();

    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-13T15:00:00Z') });
    // 2 matérias com pesos bem diferentes: sobra folga em muitos dias para caber as revisões
    // (um único assunto preenchendo 100% da grade, como no gerador, não deixaria espaço nenhum).
    const planId = await createPlan(u.id, {
      name: 'Revisão', startDate: '2026-10-13', examDate: '2027-06-01',
      subjects: [{ name: 'Português', weight: 1 }, { name: 'Direito', weight: 1 }],
      availabilityMinutes: [120, 120, 120, 120, 120, 120, 120],
    });

    const [first] = await db
      .select()
      .from(schema.studySessions)
      .where(and(eq(schema.studySessions.planId, planId), eq(schema.studySessions.origin, 'generated')));

    await scheduleReviewsForSession(first.id);
    const afterFirst = await db.select().from(schema.studySessions).where(eq(schema.studySessions.planId, planId));
    const reviews = afterFirst.filter((s) => s.origin === 'review');
    expect(reviews.length).toBeGreaterThan(0); // em janela de 8 meses, ao menos alguma revisão cabe
    expect(reviews.length).toBeLessThanOrEqual(3);
    expect(new Set(reviews.map((r) => r.reviewOffsetDays)).size).toBe(reviews.length); // sem offset repetido
    expect(reviews.every((r) => r.subjectId === first.subjectId)).toBe(true);

    // Chamar de novo (ex.: desmarcou e remarcou) não duplica.
    await scheduleReviewsForSession(first.id);
    const afterSecond = await db.select().from(schema.studySessions).where(eq(schema.studySessions.planId, planId));
    expect(afterSecond.filter((s) => s.origin === 'review')).toHaveLength(3);

    // Concluir uma REVISÃO não gera revisão de revisão.
    await scheduleReviewsForSession(reviews[0].id);
    const afterThird = await db.select().from(schema.studySessions).where(eq(schema.studySessions.planId, planId));
    expect(afterThird.filter((s) => s.origin === 'review')).toHaveLength(3);
  });

  test('revisões respeitam o limite diário junto com o resto do plano', async () => {
    const { createPlan } = await import('../services/plan.service');
    const { scheduleReviewsForSession } = await import('../services/review.service');
    const { weekdayOf } = await import('@/core/schedule');
    const u = await newUser();
    const avail = [60, 60, 60, 60, 60, 60, 60];

    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-13T15:00:00Z') });
    const planId = await createPlan(u.id, {
      name: 'Revisão apertada', startDate: '2026-10-13', examDate: '2027-02-01',
      subjects: [{ name: 'A', weight: 1 }, { name: 'B', weight: 1 }],
      availabilityMinutes: avail,
    });

    const generated = await db.select().from(schema.studySessions).where(and(eq(schema.studySessions.planId, planId), eq(schema.studySessions.origin, 'generated')));
    for (const s of generated.slice(0, 6)) await scheduleReviewsForSession(s.id);

    const all = await db.select().from(schema.studySessions).where(eq(schema.studySessions.planId, planId));
    const perDay = new Map<string, number>();
    for (const s of all) perDay.set(s.date, (perDay.get(s.date) ?? 0) + s.minutes);
    for (const [date, minutes] of perDay) expect(minutes, date).toBeLessThanOrEqual(avail[weekdayOf(date)]);
  });
});

describe('Trava do leitor de PDF (só assinante, protegida também na rota)', () => {
  test('canUseEditalUpload reflete o acesso calculado pelo banco', async () => {
    const { getUserAccess } = await import('../services/access.service');
    const u = await newUser();
    const { canUseEditalUpload } = await import('@/core/billing');

    // Recém-criado: está em teste grátis, não pode usar.
    expect(canUseEditalUpload(await getUserAccess(u))).toBe(false);

    // Vira assinante ativo: passa a poder usar.
    await db.insert(schema.subscriptions).values({
      userId: u.id,
      providerSubscriptionId: `sub_${u.id}`,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
    });
    expect(canUseEditalUpload(await getUserAccess(u))).toBe(true);
  });
});
