'use client';

import { useActionState } from 'react';
import { deleteAccountAction } from '@/server/actions/account.actions';
import type { FormState } from '@/server/actions/auth.actions';
import { SubmitButton } from './SubmitButton';

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action] = useActionState<FormState, FormData>(deleteAccountAction, undefined);
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="label" htmlFor="confirmEmail">Para confirmar, digite seu e-mail: <span className="font-mono text-xs">{email}</span></label>
      <input id="confirmEmail" name="confirmEmail" className="input" autoComplete="off" required />
      {state?.error && <p role="alert" className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-warn">{state.error}</p>}
      <SubmitButton className="btn btn-danger" pendingText="Excluindo…">Excluir minha conta definitivamente</SubmitButton>
    </form>
  );
}
