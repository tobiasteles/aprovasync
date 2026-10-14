export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#2347C9" />
      {/* anel dourado aberto = ciclo de reajuste ("sync") */}
      <path d="M34.6 13.4A15 15 0 1 0 38.8 26.6" fill="none" stroke="#F4B400" strokeWidth="3.4" strokeLinecap="round" />
      {/* check = tarefa cumprida */}
      <path d="M16.5 24.5l5.2 5.2 9.8-10.6" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
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
