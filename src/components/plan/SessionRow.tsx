import { formatMinutes } from '@/lib/format';
import { toggleSessionAction } from '@/server/actions/plan.actions';

export function SessionRow({
  id,
  planId,
  subjectName,
  color,
  minutes,
  completed,
  rescheduled,
  disabled,
}: {
  id: string;
  planId: string;
  subjectName: string;
  color: string;
  minutes: number;
  completed: boolean;
  rescheduled?: boolean;
  disabled?: boolean;
}) {
  return (
    <form action={toggleSessionAction} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
      <input type="hidden" name="sessionId" value={id} />
      <input type="hidden" name="planId" value={planId} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={completed ? `Desmarcar ${subjectName}` : `Concluir ${subjectName}`}
        aria-pressed={completed}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition disabled:opacity-50 ${
          completed ? 'border-ok bg-ok text-white' : 'border-royal-300 bg-white text-transparent hover:border-royal-600'
        }`}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </button>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      <span className={`flex-1 text-sm font-medium ${completed ? 'text-ink-soft line-through' : ''}`}>
        {subjectName}
        {rescheduled && <span className="badge ml-2 bg-gold-100 !px-2 !py-0.5 text-[10px] text-gold-700">reorganizada</span>}
      </span>
      <span className="text-sm tabular-nums text-ink-soft">{formatMinutes(minutes)}</span>
    </form>
  );
}
