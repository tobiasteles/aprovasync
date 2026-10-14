import { getCurrentUser } from '@/lib/auth';
import { exportUserData } from '@/server/services/account.service';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response('Não autorizado', { status: 401 });
  const data = await exportUserData(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="meus-dados-aprovasync.json"',
      'Cache-Control': 'no-store',
    },
  });
}
