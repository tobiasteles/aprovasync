'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signInAction, signUpAction, type FormState } from '@/server/actions/auth.actions';
import { SubmitButton } from './SubmitButton';

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const [state, action] = useActionState<FormState, FormData>(mode === 'signup' ? signUpAction : signInAction, undefined);
  const signup = mode === 'signup';

  return (
    <form action={action} className="space-y-4">
      {signup && (
        <div>
          <label className="label" htmlFor="name">Seu nome</label>
          <input id="name" name="name" className="input" autoComplete="name" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete={signup ? 'new-password' : 'current-password'}
          minLength={signup ? 8 : undefined}
          required
        />
        {signup && <p className="mt-1.5 text-xs text-ink-soft">Mínimo de 8 caracteres.</p>}
        {!signup && (
          <p className="mt-1.5 text-right text-xs">
            <Link href="/esqueci-senha" className="font-semibold text-royal-600">Esqueci minha senha</Link>
          </p>
        )}
      </div>
      {signup && (
        <label className="flex items-start gap-3 text-sm text-ink-soft">
          <input type="checkbox" name="accept" required className="mt-1 h-4 w-4 accent-[#2347C9]" />
          <span>
            Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-royal-600 underline">Termos de Uso</Link> e a{' '}
            <Link href="/privacidade" target="_blank" className="font-semibold text-royal-600 underline">Política de Privacidade</Link>.
            Tenho 18 anos ou mais, ou meu responsável legal autorizou o uso.
          </span>
        </label>
      )}
      {state?.error && (
        <p role="alert" className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-warn">
          {state.error}
        </p>
      )}
      <SubmitButton className="btn btn-primary w-full" pendingText={signup ? 'Criando conta…' : 'Entrando…'}>
        {signup ? 'Criar conta e começar' : 'Entrar'}
      </SubmitButton>
      <p className="text-center text-sm text-ink-soft">
        {signup ? (
          <>Já tem conta? <Link href="/entrar" className="font-semibold text-royal-600">Entrar</Link></>
        ) : (
          <>Primeira vez? <Link href="/cadastro" className="font-semibold text-royal-600">Criar conta grátis</Link></>
        )}
      </p>
    </form>
  );
}
