import { DeleteAccountForm } from '@/components/ui/DeleteAccountForm';
import { requireUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Minha conta' };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Minha conta</h1>

      <section className="card space-y-1 text-sm">
        <p><span className="text-ink-soft">Nome:</span> <strong>{user.name}</strong></p>
        <p><span className="text-ink-soft">E-mail:</span> <strong>{user.email}</strong></p>
        {user.termsAcceptedAt && (
          <p className="text-ink-soft">Termos e Privacidade aceitos em {formatDateTime(user.termsAcceptedAt)} (versão {user.termsVersion}).</p>
        )}
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">Seus dados (LGPD)</h2>
        <p className="mt-1 text-sm text-ink-soft">Baixe uma cópia de tudo o que guardamos sobre você: conta, planos, sessões e pagamentos.</p>
        {/* download direto do JSON */}
        <a href="/api/conta/exportar" className="btn btn-ghost mt-4" download>Baixar meus dados (JSON)</a>
      </section>

      <section className="card border-orange-200">
        <h2 className="text-lg font-bold text-warn">Excluir minha conta</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Apagamos seus planos, sessões e dados de acesso e cancelamos assinaturas ativas. Registros de pagamento são mantidos, sem identificar você,
          pelo prazo exigido pela lei fiscal. Esta ação é <strong>definitiva</strong>.
        </p>
        <DeleteAccountForm email={user.email} />
      </section>
    </div>
  );
}
