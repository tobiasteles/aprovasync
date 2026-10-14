import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { AuthForm } from '@/components/ui/AuthForm';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Entrar' };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  if (await getCurrentUser().catch(() => null)) redirect('/app');
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="card">
          <h1 className="text-2xl font-extrabold tracking-tight">Que bom te ver de volta</h1>
          <p className="mb-6 mt-1 text-sm text-ink-soft">Entre para continuar seu plano.</p>
          {sp.senha === 'redefinida' && (
            <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-ok">Senha atualizada! Entre com a nova senha.</p>
          )}
          <AuthForm mode="signin" />
        </div>
      </div>
    </main>
  );
}
