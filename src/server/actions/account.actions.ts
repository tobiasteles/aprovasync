'use server';

import { redirect } from 'next/navigation';
import { destroySession, requireUser } from '@/lib/auth';
import { deleteAccount } from '../services/account.service';
import type { FormState } from './auth.actions';

export async function deleteAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const typed = String(formData.get('confirmEmail') ?? '').trim().toLowerCase();
  if (typed !== user.email.toLowerCase()) return { error: 'Digite o seu e-mail exatamente como cadastrado para confirmar.' };

  await deleteAccount(user.id);
  await destroySession();
  redirect('/');
}
