import { describe, expect, test } from 'vitest';
import { MemoryRateLimiter } from '../memory-limiter';
import { generateToken, hashToken, isTokenUsable } from '../tokens';

describe('tokens de recuperação', () => {
  test('gera tokens únicos e longos; o hash não revela o token', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(43); // 32 bytes em base64url
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).not.toContain(a.token);
    expect(hashToken(a.token)).toBe(a.hash);
  });

  const NOW = new Date('2026-10-13T12:00:00.000Z');
  test.each<[string, { expiresAt: Date; usedAt: Date | null }, boolean]>([
    ['válido', { expiresAt: new Date('2026-10-13T12:00:00.001Z'), usedAt: null }, true],
    ['expira exatamente agora', { expiresAt: NOW, usedAt: null }, false],
    ['expirado', { expiresAt: new Date('2026-10-13T11:00:00.000Z'), usedAt: null }, false],
    ['já usado', { expiresAt: new Date('2026-10-14T12:00:00.000Z'), usedAt: new Date('2026-10-13T11:00:00.000Z') }, false],
  ])('isTokenUsable: %s → %s', (_label, row, expected) => {
    expect(isTokenUsable(row, NOW)).toBe(expected);
  });
});

describe('MemoryRateLimiter', () => {
  const MIN = 60_000;

  test.each([
    [3, 3, true],
    [3, 4, false],
    [5, 5, true],
    [5, 6, false],
  ])('limite %i: tentativa nº %i → ok=%s', (limit, attempt, ok) => {
    const rl = new MemoryRateLimiter();
    let last = { ok: true, retryAfterMs: 0 };
    for (let i = 1; i <= attempt; i++) last = rl.check('k', limit, 15 * MIN, 1_000_000 + i);
    expect(last.ok).toBe(ok);
  });

  test('informa quanto falta para liberar', () => {
    const rl = new MemoryRateLimiter();
    const t0 = 5_000_000;
    for (let i = 0; i < 3; i++) rl.check('k', 3, 10 * MIN, t0);
    const blocked = rl.check('k', 3, 10 * MIN, t0 + 4 * MIN);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(6 * MIN);
  });

  test('libera depois da janela (janela deslizante)', () => {
    const rl = new MemoryRateLimiter();
    const t0 = 9_000_000;
    for (let i = 0; i < 3; i++) rl.check('k', 3, 10 * MIN, t0);
    expect(rl.check('k', 3, 10 * MIN, t0 + 10 * MIN - 1).ok).toBe(false);
    expect(rl.check('k', 3, 10 * MIN, t0 + 10 * MIN + 1).ok).toBe(true);
  });

  test('chaves diferentes não se afetam', () => {
    const rl = new MemoryRateLimiter();
    for (let i = 0; i < 3; i++) rl.check('a@x.com', 3, MIN, 1);
    expect(rl.check('a@x.com', 3, MIN, 2).ok).toBe(false);
    expect(rl.check('b@x.com', 3, MIN, 2).ok).toBe(true);
  });
});
