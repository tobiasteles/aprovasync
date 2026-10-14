export function ProgressRing({ percent, size = 132 }: { percent: number; size?: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${clamped}% do edital concluído`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f3efe5" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={clamped >= 100 ? '#0e9f6e' : '#f4b400'}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * clamped) / 100}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-extrabold leading-none text-ink">{Math.round(clamped)}%</div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft">do edital</div>
      </div>
    </div>
  );
}
