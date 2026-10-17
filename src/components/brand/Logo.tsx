/**
 * Marca AprovaSync — v2.
 * Conceito: um "check" (tarefa cumprida) dentro de um anel aberto (o ciclo nunca fecha de propósito:
 * o plano não "quebra", ele se reorganiza). Formas sólidas, sem gradiente, para ficar nítido em 16px.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="#1E3FC4" />
      <path
        d="M36.5 14.2A15.5 15.5 0 1 0 40 25"
        fill="none"
        stroke="#F2B705"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M15.5 24.8l5.6 5.6L33 17.5"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-xl font-extrabold tracking-tight text-ink">
        Aprova<span className="text-royal-600">Sync</span>
      </span>
    </span>
  );
}
