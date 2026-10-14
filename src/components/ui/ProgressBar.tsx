export function ProgressBar({ percent, color = '#2347C9' }: { percent: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, percent))}%`, background: color }} />
    </div>
  );
}
