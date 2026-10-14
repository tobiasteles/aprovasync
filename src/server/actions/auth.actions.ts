'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSession, destroySession, hashPassword, verifyPassword } from '@/lib/auth';
import { LEGAL } from '@/lib/legal';
import { clientIp, rateLimit, RULES, tooManyMessage } from '@/lib/ratelimit';
import { getDb } from '../db/client';
import { users } from '../db/schema';
import { requestPasswordReset, resetPassword } from '../services/password-reset.service';

export type FormState = { error?: string; message?: string } | undefined;

const email = z.string().trim().toLowerCase().email('E-mail inválido.');

const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(80),
  email,
  password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.').max(100),
});

const signInSchema = z.object({ email, password: z.string().min(1, 'Informe a senha.') });

// Hash fixo para igualar o tempo de resposta quando o e-mail não existe.
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5kLq3pM1Qh2bq8XHw1u7r0b3m5q8h9y';

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get('accept') !== 'on') {
    return { error: 'Para continuar, aceite os Termos de Uso e a Política de Privacidade.' };
  }
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const limited = await rateLimit(RULES.signupIp, await clientIp());
  if (!limited.ok) return { error: tooManyMessage(limited.retryAfterSec) };

  const { name, email, password } = parsed.data;
  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: 'Já existe uma conta com este e-mail. Tente entrar.' };

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: await hashPassword(password),
      termsAcceptedAt: new Date(),
      termsVersion: LEGAL.version,
    })
    .returning({ id: users.id });

  await createSession(user.id);
  redirect('/app');
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;

  const [byIp, byEmail] = await Promise.all([
    rateLimit(RULES.loginIp, await clientIp()),
    rateLimit(RULES.loginEmail, email),
  ]);
  if (!byIp.ok || !byEmail.ok) return { error: tooManyMessage(Math.max(byIp.retryAfterSec, byEmail.retryAfterSec)) };

  const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { error: 'E-mail ou senha incorretos.' };

  await createSession(user.id);
  redirect('/app');
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect('/');
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = email.safeParse(formData.get('email'));
  if (!parsed.success) return { error: 'E-mail inválido.' };

  const [byIp, byEmail] = await Promise.all([
    rateLimit(RULES.forgotIp, await clientIp()),
    rateLimit(RULES.forgotEmail, parsed.data),
  ]);
  if (!byIp.ok || !byEmail.ok) return { error: tooManyMessage(Math.max(byIp.retryAfterSec, byEmail.retryAfterSec)) };

  await requestPasswordReset(parsed.data);
  // Mesma resposta exista ou não a conta (evita descobrir quem é cliente).
  return { message: 'Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha. Ele vale por 60 minutos.' };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) return { error: 'A senha precisa ter ao menos 8 caracteres.' };
  if (password.length > 100) return { error: 'Senha muito longa.' };
  if (password !== confirm) return { error: 'As senhas não conferem.' };

  const limited = await rateLimit(RULES.resetIp, await clientIp());
  if (!limited.ok) return { error: tooManyMessage(limited.retryAfterSec) };

  const result = await resetPassword(token, password);
  if (result === 'invalid') return { error: 'Este link é inválido ou expirou. Peça um novo em “Esqueci minha senha”.' };
  redirect('/entrar?senha=redefinida');
}
