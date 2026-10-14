'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Status = 'pending' | 'approved' | 'failed';

/** Consulta o status a cada 4s. Ao aprovar, leva o usuário direto para o plano liberado. */
export function PixStatus({ paymentId, planId }: { paymentId: string; planId: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('pending');

  useEffect(() => {
    if (status !== 'pending') return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}/status`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { status: Status };
        setStatus(data.status);
        if (data.status === 'approved') {
          setTimeout(() => router.push(planId ? `/app/planos/${planId}?pagamento=ok` : '/app'), 1200);
        }
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [paymentId, planId, router, status]);

  if (status === 'approved') {
    return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-ok">Pagamento confirmado! Liberando seu plano…</p>;
  }
  if (status === 'failed') {
    return <p className="rounded-xl bg-orange-50 px-4 py-3 text-center text-sm text-warn">Este Pix expirou ou foi recusado. Volte e gere um novo.</p>;
  }
  return (
    <p className="flex items-center justify-center gap-2 text-center text-sm text-ink-soft">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold-500" /> Aguardando o pagamento…
    </p>
  );
}
