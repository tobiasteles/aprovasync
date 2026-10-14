/**
 * Remove dados pessoais de qualquer evento antes de enviar ao Sentry (LGPD):
 * usuário/IP, cookies, cabeçalhos e corpo da requisição.
 */
export function scrubEvent<T extends { user?: unknown; request?: { cookies?: unknown; headers?: unknown; data?: unknown; query_string?: unknown } }>(
  event: T,
): T {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
  }
  return event;
}
