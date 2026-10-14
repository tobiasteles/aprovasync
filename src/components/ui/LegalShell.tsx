import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { hasLegalPlaceholders, LEGAL } from '@/lib/legal';

export function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <header className="page flex items-center justify-between py-5">
        <Link href="/"><Logo /></Link>
        <nav className="flex gap-4 text-sm font-medium text-ink-soft">
          <Link href="/termos" className="hover:text-royal-600">Termos</Link>
          <Link href="/privacidade" className="hover:text-royal-600">Privacidade</Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-6">
        {process.env.NODE_ENV !== 'production' && hasLegalPlaceholders() && (
          <p className="mb-6 rounded-xl bg-orange-50 px-4 py-3 text-sm text-warn">
            <strong>Aviso (só aparece em desenvolvimento):</strong> preencha os dados da empresa no <code>.env.local</code>
            (NEXT_PUBLIC_COMPANY_NAME, NEXT_PUBLIC_COMPANY_CPF ou _CNPJ, NEXT_PUBLIC_COMPANY_ADDRESS, NEXT_PUBLIC_CONTACT_EMAIL, NEXT_PUBLIC_FORUM_CITY) antes de publicar.
          </p>
        )}
        <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">Versão {LEGAL.version} · atualizado em {LEGAL.updatedAtLabel}</p>
        <article className="legal mt-8">{children}</article>
      </main>
    </div>
  );
}
