import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatBRL } from '@/core/billing';
import { CopyButton } from '@/components/billing/CopyButton';
import { PixStatus } from '@/components/billing/PixStatus';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/server/db/client';
import { payments } from '@/server/db/schema';

export const metadata = { title: 'Pagar com Pix' };

export default async function PixPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const user = await requireUser();
  const { paymentId } = await params;
  const [payment] = await getDb()
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.userId, user.id)))
    .limit(1);
  if (!payment || payment.provider !== 'mercadopago' || !payment.pixQrCode) notFound();

  const expires = payment.pixExpiresAt?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Pague com Pix</h1>
        <p className="mt-1 text-sm text-ink-soft">{formatBRL(payment.amountCents)} · válido até {expires}</p>
      </div>

      <div className="card space-y-4">
        {payment.pixQrBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${payment.pixQrBase64}`}
            alt="QR Code do Pix"
            width={256}
            height={256}
            className="mx-auto rounded-xl border border-line"
          />
        )}
        <p className="text-center text-xs text-ink-soft">Abra o app do seu banco, escolha Pix → “Pix Copia e Cola” ou leia o QR Code.</p>
        <textarea readOnly value={payment.pixQrCode} rows={3} className="input resize-none font-mono text-xs" aria-label="Pix copia e cola" />
        <CopyButton text={payment.pixQrCode} />
      </div>

      <PixStatus paymentId={payment.id} planId={payment.planId} />
      <p className="text-center text-sm"><Link href="/app/assinatura" className="text-ink-soft underline">Voltar</Link></p>
    </div>
  );
}
