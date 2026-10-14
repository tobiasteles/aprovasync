import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { ResetPasswordForm } from '@/components/ui/PasswordForms';

export const metadata = { title: 'Criar nova senha' };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="card">
          <h1 className="text-2xl font-extrabold tracking-tight">Criar nova senha</h1>
          {token ? (
            <>
              <p className="mb-6 mt-1 text-sm text-ink-soft">Escolha uma senha nova. Ao salvar, os outros dispositivos serão desconectados.</p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              Link incompleto. <Link href="/esqueci-senha" className="font-semibold text-royal-600">Peça um novo</Link>.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
