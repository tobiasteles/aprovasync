import 'server-only';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getDb } from '@/server/db/client';
import { users, type User } from '@/server/db/schema';
import { env } from './env';

const COOKIE = 'aprovasync_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

const secret = () => new TextEncoder().encode(env('AUTH_SECRET'));

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const [user] = await getDb().select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user) return null;
    // Sessões emitidas antes da última troca de senha deixam de valer.
    if (user.passwordChangedAt && (payload.iat ?? 0) < Math.floor(user.passwordChangedAt.getTime() / 1000)) return null;
    return user;
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  return user;
}
