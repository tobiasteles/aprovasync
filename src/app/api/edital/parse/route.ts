import { canUseEditalUpload } from '@/core/billing';
import { getCurrentUser } from '@/lib/auth';
import { clientIp, rateLimit, RULES } from '@/lib/ratelimit';
import { getUserAccess } from '@/server/services/access.service';
import { EditalExtractionError, MAX_PDF_BYTES, parseEditalPdf, PdfTextError } from '@/server/services/edital.service';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Não autorizado.' }, { status: 401 });

  // Chama uma API paga por uso: reservado a quem já é assinante (ou ao modo beta), para o custo
  // não correr solto durante o teste grátis. Verificado de novo aqui, não só na interface.
  const access = await getUserAccess(user);
  if (!canUseEditalUpload(access)) {
    return Response.json(
      { error: 'A leitura de edital em PDF é exclusiva para assinantes. Assine para liberar, ou preencha o formulário manualmente.' },
      { status: 403 },
    );
  }

  const [byUser, byIp] = await Promise.all([rateLimit(RULES.editalUser, user.id), rateLimit(RULES.editalIp, await clientIp())]);
  if (!byUser.ok || !byIp.ok) {
    return Response.json({ error: 'Muitos editais enviados em pouco tempo. Aguarde alguns minutos e tente de novo.' }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Não conseguimos ler o envio. Tente de novo.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'Envie um arquivo PDF.' }, { status: 400 });
  if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return Response.json({ error: 'O arquivo precisa ser um PDF.' }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return Response.json({ error: `O arquivo passou de ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB. Envie um PDF menor.` }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await parseEditalPdf(bytes);
    return Response.json(result);
  } catch (e) {
    if (e instanceof PdfTextError || e instanceof EditalExtractionError) {
      return Response.json({ error: e.message }, { status: 422 });
    }
    console.error('[edital/parse]', e);
    return Response.json({ error: 'Algo deu errado ao ler o edital. Tente de novo.' }, { status: 500 });
  }
}
