import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { generateToken, hashToken, isTokenUsable, RESET_TOKEN_TTL_MINUTES } from '@/core/security/tokens';
import { hashPassword } from '@/lib/auth';
import { appUrl } from '@/lib/env';
import { getDb } from '../db/client';
import { passwordResetTokens, users } from '../db/schema';
import { passwordResetEmail, sendEmail } from '../email';

/** Nunca revela se o e-mail existe: quem chama responde sempre a mesma mensagem. */
export async function requestPasswordReset(email: string): Promise<void> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return;

  const { token, hash } = generateToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
  });

  try {
    const mail = passwordResetEmail(user.name, `${appUrl()}/redefinir-senha?token=${token}`);
    await sendEmail({ to: user.email, ...mail });
  } catch (e) {
    console.error('[password-reset] falha ao enviar e-mail', e);
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<'ok' | 'invalid'> {
  const db = getDb();
  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, hashToken(token))).limit(1);
  if (!row || !isTokenUsable(row)) return 'invalid';

  const passwordHash = await hashPassword(newPassword);
  return db.transaction(async (tx) => {
    // Consome o token de forma atômica: se duas requisições chegarem juntas, só uma vence.
    const claimed = await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt)))
      .returning({ id: passwordResetTokens.id });
    if (claimed.length === 0) return 'invalid' as const;

    await tx.update(users).set({ passwordHash, passwordChangedAt: new Date() }).where(eq(users.id, row.userId));
    // Invalida quaisquer outros links pendentes deste usuário.
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, row.userId), isNull(passwordResetTokens.usedAt)));
    return 'ok' as const;
  });
}
