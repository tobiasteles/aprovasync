import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { AuthForm } from '@/components/ui/AuthForm';
import { getCurrentUser } from '@/lib/auth';
import { isBeta } from '@/lib/config';

export const metadata = { title: 'Criar conta' };

export default async function Page() {
  if (await getCurrentUser().catch(() => null)) redirect('/app');
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="card">
          <h1 className="text-2xl font-extrabold tracking-tight">Crie sua conta</h1>
          <p className="mb-6 mt-1 text-sm text-ink-soft">{isBeta() ? 'Versão beta gratuita, sem cartão.' : '7 dias grátis, sem cartão.'}</p>
          <AuthForm mode="signup" />
        </div>
      </div>
    </main>
  );
}
