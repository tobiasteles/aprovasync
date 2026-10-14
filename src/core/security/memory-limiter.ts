/**
 * Limitador de janela deslizante em memória. Usado como fallback quando o Upstash não está
 * configurado (desenvolvimento). Em produção serverless use o Upstash: a memória não é compartilhada.
 */
export class MemoryRateLimiter {
  private hits = new Map<string, number[]>();

  check(key: string, limit: number, windowMs: number, now: number = Date.now()): { ok: boolean; retryAfterMs: number } {
    const recent = (this.hits.get(key) ?? []).filter((t) => t > now - windowMs);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return { ok: false, retryAfterMs: recent[0] + windowMs - now };
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.purge(now, windowMs);
    return { ok: true, retryAfterMs: 0 };
  }

  private purge(now: number, windowMs: number) {
    for (const [k, v] of this.hits) if (v.every((t) => t <= now - windowMs)) this.hits.delete(k);
  }
}
