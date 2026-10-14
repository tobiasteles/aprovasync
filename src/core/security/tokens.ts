import { createHash, randomBytes } from 'node:crypto';

/** Token aleatório de 256 bits (URL-safe) e seu hash SHA-256. Só o hash vai para o banco. */
export function generateToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isTokenUsable(row: { expiresAt: Date; usedAt: Date | null }, now: Date = new Date()): boolean {
  return row.usedAt === null && row.expiresAt.getTime() > now.getTime();
}

export const RESET_TOKEN_TTL_MINUTES = 60;
