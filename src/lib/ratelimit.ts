import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';
import { MemoryRateLimiter } from '@/core/security/memory-limiter';

export interface Rule {
  name: string;
  limit: number;
  windowSec: number;
}

/** Regras por ação. "ip" protege contra varredura; a regra por e-mail protege a conta individual. */
export const RULES = {
  loginEmail: { name: 'login-email', limit: 5, windowSec: 15 * 60 },
  loginIp: { name: 'login-ip', limit: 30, windowSec: 15 * 60 },
  signupIp: { name: 'signup-ip', limit: 5, windowSec: 60 * 60 },
  forgotEmail: { name: 'forgot-email', limit: 3, windowSec: 60 * 60 },
  forgotIp: { name: 'forgot-ip', limit: 10, windowSec: 60 * 60 },
  resetIp: { name: 'reset-ip', limit: 10, windowSec: 60 * 60 },
  checkoutUser: { name: 'checkout-user', limit: 10, windowSec: 60 * 60 },
} as const satisfies Record<string, Rule>;

const memory = new MemoryRateLimiter();
const upstash = new Map<string, Ratelimit>();
const hasUpstash = () => Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
let warned = false;

export async function rateLimit(rule: Rule, identifier: string): Promise<{ ok: boolean; retryAfterSec: number }> {
  if (hasUpstash()) {
    try {
      let rl = upstash.get(rule.name);
      if (!rl) {
        rl = new Ratelimit({
          redis: Redis.fromEnv(),
          limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSec} s`),
          prefix: `aprovasync:rl:${rule.name}`,
        });
        upstash.set(rule.name, rl);
      }
      const res = await rl.limit(identifier);
      return { ok: res.success, retryAfterSec: Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) };
    } catch (e) {
      // Falha aberta: indisponibilidade do Redis não deve impedir o login de todo mundo.
      console.error('[ratelimit] upstash indisponível', e);
      return { ok: true, retryAfterSec: 0 };
    }
  }

  if (process.env.NODE_ENV === 'production' && !warned) {
    warned = true;
    console.warn('[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN ausentes: usando memória local, pouco eficaz em serverless.');
  }
  const res = memory.check(`${rule.name}:${identifier}`, rule.limit, rule.windowSec * 1000);
  return { ok: res.ok, retryAfterSec: Math.ceil(res.retryAfterMs / 1000) };
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

export function tooManyMessage(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `Muitas tentativas. Aguarde ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} e tente de novo.`;
}
