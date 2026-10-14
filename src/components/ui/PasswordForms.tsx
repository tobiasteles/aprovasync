'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { forgotPasswordAction, resetPasswordAction, type FormState } from '@/server/actions/auth.actions';
import { SubmitButton } from './SubmitButton';

function Feedback({ state }: { state: FormState }) {
  if (state?.error)
    return <p role="alert" className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-warn">{state.error}</p>;
  if (state?.message)
    return <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-ok">{state.message}</p>;
  return null;
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(forgotPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail da sua conta</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <Feedback state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingText="Enviando…">Enviar link</SubmitButton>
      <p className="text-center text-sm"><Link href="/entrar" className="font-semibold text-royal-600">Voltar para entrar</Link></p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">Nova senha</label>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required />
        <p className="mt-1.5 text-xs text-ink-soft">Mínimo de 8 caracteres.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repita a nova senha</label>
        <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <Feedback state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingText="Salvando…">Salvar nova senha</SubmitButton>
    </form>
  );
}
