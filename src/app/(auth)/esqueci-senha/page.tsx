import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { ForgotPasswordForm } from '@/components/ui/PasswordForms';

export const metadata = { title: 'Esqueci minha senha' };

export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="card">
          <h1 className="text-2xl font-extrabold tracking-tight">Vamos recuperar seu acesso</h1>
          <p className="mb-6 mt-1 text-sm text-ink-soft">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
