import Link from 'next/link';
import { PRICING, formatBRL } from '@/core/billing';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { isBeta } from '@/lib/config';
import { formatDateTime } from '@/lib/format';
import {
  openBillingPortalAction,
  startPassCardCheckoutAction,
  startPassPixCheckoutAction,
  startSubscriptionCheckoutAction,
} from '@/server/actions/billing.actions';
import { getUserAccess } from '@/server/services/access.service';
import { listPlans } from '@/server/services/plan.service';

export const metadata = { title: 'Assinatura' };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const MESSAGES: Record<string, { text: string; cls: string }> = {
  sucesso: { text: 'Assinatura confirmada! Pode levar alguns segundos para liberar.', cls: 'bg-emerald-50 text-ok' },
  cancelado: { text: 'Pagamento cancelado. Nada foi cobrado.', cls: 'bg-paper-2 text-ink-soft' },
  erro: { text: 'Não foi possível iniciar o pagamento agora. Tente novamente em instantes.', cls: 'bg-orange-50 text-warn' },
  muitas: { text: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.', cls: 'bg-orange-50 text-warn' },
  'sem-plano': { text: 'Crie um plano antes de comprar o Passe do Edital.', cls: 'bg-orange-50 text-warn' },
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (isBeta()) redirect('/app');
  const user = await requireUser();
  const sp = await searchParams;
  const [access, plans] = await Promise.all([getUserAccess(user), listPlans(user.id)]);
  const preselected = first(sp.plano);
  const message = MESSAGES[first(sp.status) ?? ''];

  const statusLine =
    access.kind === 'subscriber'
      ? `Assinatura ativa${access.until ? ` · renova em ${formatDateTime(access.until)}` : ''}`
      : access.kind === 'trial' && access.until
        ? `Teste grátis até ${formatDateTime(access.until)}`
        : 'Sem acesso ativo no momento';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Assinatura e pagamentos</h1>
        <p className="mt-1 text-ink-soft">{statusLine}</p>
      </div>

      {message && <p className={`rounded-2xl px-5 py-4 text-sm ${message.cls}`}>{message.text}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Passe do Edital */}
        <section className="card flex flex-col">
          <span className="badge self-start bg-gold-100 text-gold-700">Pix ou cartão</span>
          <h2 className="mt-3 text-xl font-bold">{PRICING.pass.name}</h2>
          <p className="mt-2 text-3xl font-extrabold">{formatBRL(PRICING.pass.amountCents)}</p>
          <p className="mt-1 text-sm text-ink-soft">{PRICING.pass.description}</p>

          {plans.length === 0 ? (
            <p className="mt-5 rounded-xl bg-paper-2 px-4 py-3 text-sm text-ink-soft">Crie um plano para poder liberá-lo.</p>
          ) : (
            <form className="mt-5 space-y-3">
              <label className="label" htmlFor="planId">Qual plano liberar?</label>
              <select id="planId" name="planId" className="input" defaultValue={preselected ?? plans[0].id}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <SubmitButton className="btn btn-gold w-full" formAction={startPassPixCheckoutAction} pendingText="Gerando Pix…">
                Pagar com Pix
              </SubmitButton>
              <SubmitButton className="btn btn-ghost w-full" formAction={startPassCardCheckoutAction} pendingText="Abrindo pagamento…">
                Pagar com cartão
              </SubmitButton>
            </form>
          )}
        </section>

        {/* Assinatura */}
        <section className="card flex flex-col">
          <span className="badge self-start bg-royal-100 text-royal-700">Cartão de crédito</span>
          <h2 className="mt-3 text-xl font-bold">{PRICING.subscription.name}</h2>
          <p className="mt-2 text-3xl font-extrabold">{formatBRL(PRICING.subscription.amountCents)}<span className="text-base font-medium text-ink-soft"> /mês</span></p>
          <p className="mt-1 flex-1 text-sm text-ink-soft">{PRICING.subscription.description} Cancele quando quiser.</p>

          {access.kind === 'subscriber' ? (
            user.stripeCustomerId && (
              <form action={openBillingPortalAction} className="mt-5">
                <SubmitButton className="btn btn-ghost w-full" pendingText="Abrindo…">Gerenciar assinatura</SubmitButton>
              </form>
            )
          ) : (
            <form action={startSubscriptionCheckoutAction} className="mt-5">
              <SubmitButton className="btn btn-primary w-full" pendingText="Abrindo pagamento…">Assinar por {formatBRL(PRICING.subscription.amountCents)}/mês</SubmitButton>
            </form>
          )}
        </section>
      </div>

      <p className="text-center text-xs text-ink-soft">
        Ao pagar você concorda com os <Link href="/termos" className="underline">Termos de Uso</Link>. Arrependimento em até 7 dias, com reembolso integral (<Link href="/termos#reembolso" className="underline">saiba mais</Link>).
      </p>
      <p className="text-center text-xs text-ink-soft">Pagamentos processados por Mercado Pago (Pix) e Stripe (cartão). Não armazenamos dados do seu cartão.</p>
    </div>
  );
}
