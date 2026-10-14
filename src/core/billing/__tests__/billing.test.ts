import { createHmac } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { computeAccess, licenseExpiry, type AccessInput } from '../access';
import { formatBRL, PRICING } from '../pricing';
import { mapStripeSubscriptionStatus, toBrazilOffsetISO, verifyMercadoPagoSignature } from '../webhooks';

const NOW = new Date('2026-10-13T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe('computeAccess', () => {
  test.each<[string, Omit<AccessInput, 'now'>, string, boolean]>([
    ['usuário novo → teste grátis', { userCreatedAt: daysAgo(1) }, 'trial', true],
    ['teste vence exatamente em 7 dias', { userCreatedAt: daysAgo(7) }, 'none', false],
    ['teste no último instante', { userCreatedAt: new Date(NOW.getTime() - 7 * 86_400_000 + 1) }, 'trial', true],
    ['teste expirado sem pagamento', { userCreatedAt: daysAgo(30) }, 'none', false],
    ['assinatura ativa', { userCreatedAt: daysAgo(90), subscription: { status: 'active', currentPeriodEnd: daysAhead(10) } }, 'subscriber', true],
    ['assinatura em trial do Stripe', { userCreatedAt: daysAgo(90), subscription: { status: 'trialing', currentPeriodEnd: daysAhead(3) } }, 'subscriber', true],
    ['inadimplente dentro da carência (3 dias)', { userCreatedAt: daysAgo(90), subscription: { status: 'past_due', currentPeriodEnd: daysAgo(2) } }, 'subscriber', true],
    ['inadimplente fora da carência', { userCreatedAt: daysAgo(90), subscription: { status: 'past_due', currentPeriodEnd: daysAgo(4) } }, 'none', false],
    ['assinatura cancelada', { userCreatedAt: daysAgo(90), subscription: { status: 'canceled', currentPeriodEnd: daysAhead(5) } }, 'none', false],
    ['passe válido', { userCreatedAt: daysAgo(90), passExpiresAt: daysAhead(40) }, 'pass', true],
    ['passe expirado', { userCreatedAt: daysAgo(90), passExpiresAt: daysAgo(1) }, 'none', false],
    ['modo beta libera mesmo com teste vencido', { userCreatedAt: daysAgo(300), betaFree: true }, 'beta', true],
    ['assinante tem prioridade sobre passe', { userCreatedAt: daysAgo(90), passExpiresAt: daysAhead(40), subscription: { status: 'active', currentPeriodEnd: daysAhead(5) } }, 'subscriber', true],
    ['assinatura cancelada mas passe válido', { userCreatedAt: daysAgo(90), passExpiresAt: daysAhead(40), subscription: { status: 'canceled', currentPeriodEnd: null } }, 'pass', true],
  ])('%s', (_label, input, kind, canUse) => {
    const access = computeAccess({ now: NOW, ...input });
    expect(access.kind).toBe(kind);
    expect(access.canUse).toBe(canUse);
  });
});

describe('licenseExpiry', () => {
  test.each([
    ['prova em 2027-06-15 + 7 dias', '2027-06-15', '2027-06-23T03:00:00.000Z'],
    ['bissexto: 28/02/2028 + 7 dias cruza o 29/02', '2028-02-28', '2028-03-07T03:00:00.000Z'],
    ['comum: 28/02/2027 + 7 dias', '2027-02-28', '2027-03-08T03:00:00.000Z'],
    ['virada de ano', '2026-12-28', '2027-01-05T03:00:00.000Z'],
  ])('%s', (_label, exam, expected) => {
    expect(licenseExpiry(exam, NOW).toISOString()).toBe(expected);
  });

  test.each([
    ['prova amanhã → mínimo de 30 dias', '2026-10-14'],
    ['prova já passou → mínimo de 30 dias', '2026-01-01'],
  ])('%s', (_label, exam) => {
    expect(licenseExpiry(exam, NOW).toISOString()).toBe(daysAhead(PRICING.passMinDays).toISOString());
  });
});

describe('verifyMercadoPagoSignature', () => {
  const secret = 'segredo-de-teste';
  const sign = (manifest: string) => createHmac('sha256', secret).update(manifest).digest('hex');

  test.each<[string, { dataId: string; requestId: string | null; manifest: string; ok: boolean }]>([
    ['assinatura correta', { dataId: '123456', requestId: 'req-1', manifest: 'id:123456;request-id:req-1;ts:1700000000;', ok: true }],
    ['sem request-id (parte omitida)', { dataId: '123456', requestId: null, manifest: 'id:123456;ts:1700000000;', ok: true }],
    ['id alfanumérico vai em minúsculas', { dataId: 'ABC123', requestId: 'r', manifest: 'id:abc123;request-id:r;ts:1700000000;', ok: true }],
    ['manifesto adulterado', { dataId: '123456', requestId: 'req-1', manifest: 'id:999999;request-id:req-1;ts:1700000000;', ok: false }],
  ])('%s', (_label, c) => {
    const header = `ts=1700000000,v1=${sign(c.manifest)}`;
    expect(
      verifyMercadoPagoSignature({ secret, signatureHeader: header, requestId: c.requestId, dataId: c.dataId }),
    ).toBe(c.ok);
  });

  test.each([
    ['sem header', null, '123'],
    ['header malformado', 'lixo', '123'],
    ['sem data.id', 'ts=1,v1=abc', null],
  ])('rejeita: %s', (_label, header, dataId) => {
    expect(verifyMercadoPagoSignature({ secret, signatureHeader: header, requestId: null, dataId })).toBe(false);
  });

  test('segredo errado', () => {
    const header = `ts=1700000000,v1=${sign('id:1;ts:1700000000;')}`;
    expect(verifyMercadoPagoSignature({ secret: 'outro', signatureHeader: header, requestId: null, dataId: '1' })).toBe(false);
  });
});

describe('helpers', () => {
  test.each([
    ['active', 'active'],
    ['trialing', 'trialing'],
    ['past_due', 'past_due'],
    ['unpaid', 'past_due'],
    ['incomplete', 'past_due'],
    ['canceled', 'canceled'],
    ['incomplete_expired', 'canceled'],
    ['paused', 'canceled'],
  ])('Stripe %s → %s', (input, expected) => {
    expect(mapStripeSubscriptionStatus(input)).toBe(expected);
  });

  test.each([
    ['2026-10-13T15:00:00.000Z', '2026-10-13T12:00:00.000-03:00'],
    ['2026-10-14T01:30:00.000Z', '2026-10-13T22:30:00.000-03:00'],
  ])('toBrazilOffsetISO(%s)', (utc, expected) => {
    expect(toBrazilOffsetISO(new Date(utc))).toBe(expected);
  });

  test.each([
    [1990, /19,90/],
    [5990, /59,90/],
  ])('formatBRL(%i)', (cents, re) => {
    expect(formatBRL(cents)).toMatch(re);
  });
});
