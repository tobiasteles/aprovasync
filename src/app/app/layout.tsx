import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Logo } from "@/components/brand/Logo";
import { requireUser } from "@/lib/auth";
import { isBeta } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { signOutAction } from "@/server/actions/auth.actions";
import { getUserAccess } from "@/server/services/access.service";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const access = await getUserAccess(user);

  const badge =
    access.kind === "beta"
      ? { text: "Beta gratuito", cls: "bg-gold-100 text-gold-700" }
      : access.kind === "subscriber"
        ? { text: "Assinante", cls: "bg-royal-100 text-royal-700" }
        : access.kind === "trial" && access.until
          ? {
              text: `Teste grátis até ${formatDateTime(access.until)}`,
              cls: "bg-gold-100 text-gold-700",
            }
          : { text: "Sem plano ativo", cls: "bg-orange-100 text-warn" };

  return (
    <div>
      <Analytics />
      <SpeedInsights />
      <header className="border-b border-line bg-white/70 backdrop-blur">
        <div className="page flex flex-wrap items-center justify-between gap-3 py-3">
          <Link href="/app">
            <Logo size={32} />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link href="/app" className="rounded-lg px-3 py-2 hover:bg-paper-2">
              Meus planos
            </Link>
            {!isBeta() && (
              <Link
                href="/app/assinatura"
                className="rounded-lg px-3 py-2 hover:bg-paper-2"
              >
                Assinatura
              </Link>
            )}
            <Link
              href="/app/conta"
              className="rounded-lg px-3 py-2 hover:bg-paper-2"
            >
              Conta
            </Link>
            <span className={`badge ml-2 hidden sm:inline-flex ${badge.cls}`}>
              {badge.text}
            </span>
            <form action={signOutAction}>
              <button
                className="rounded-lg px-3 py-2 text-ink-soft hover:bg-paper-2"
                type="submit"
              >
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="page py-8">{children}</main>
      <footer className="page flex flex-wrap justify-center gap-5 pb-10 text-xs text-ink-soft">
        <Link href="/termos" className="hover:text-royal-600">
          Termos de Uso
        </Link>
        <Link href="/privacidade" className="hover:text-royal-600">
          Política de Privacidade
        </Link>
      </footer>
    </div>
  );
}
