import 'server-only';
import { env } from '@/lib/env';

/**
 * Envio via Resend (HTTP). Sem RESEND_API_KEY: em desenvolvimento só loga o conteúdo no terminal;
 * em produção lança erro (o chamador captura e registra, sem revelar nada ao usuário).
 */
export async function sendEmail(p: { to: string; subject: string; html: string; text: string }): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY não configurada.');
    console.log(`\n[email:dev] Para: ${p.to}\nAssunto: ${p.subject}\n${p.text}\n`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env('EMAIL_FROM'), to: [p.to], subject: p.subject, html: p.html, text: p.text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function passwordResetEmail(name: string | null, url: string) {
  const hello = name ? `Olá, ${escapeHtml(name.split(' ')[0])}!` : 'Olá!';
  return {
    subject: 'Redefinir sua senha do AprovaSync',
    text: `${name ? `Olá, ${name.split(' ')[0]}!` : 'Olá!'}\n\nRecebemos um pedido para redefinir sua senha. Use o link abaixo (vale por 60 minutos):\n${url}\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.\n\nAprovaSync`,
    html: `<div style="font-family:Arial,sans-serif;background:#faf8f3;padding:32px">
  <div style="max-width:480px;margin:auto;background:#fff;border:1px solid #e6e1d3;border-radius:20px;padding:32px;color:#12203f">
    <p style="font-size:20px;font-weight:800;margin:0 0 20px">Aprova<span style="color:#2347c9">Sync</span></p>
    <p style="font-size:16px;margin:0 0 12px">${hello}</p>
    <p style="font-size:15px;line-height:1.5;color:#4a5776;margin:0 0 24px">Recebemos um pedido para redefinir a sua senha. O link vale por <strong>60 minutos</strong>.</p>
    <a href="${url}" style="display:inline-block;background:#2347c9;color:#fff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:12px">Criar nova senha</a>
    <p style="font-size:13px;color:#4a5776;margin:24px 0 0">Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
  </div></div>`,
  };
}
