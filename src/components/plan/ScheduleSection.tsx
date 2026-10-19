import Link from "next/link";
import { addDays } from "@/core/schedule";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  formatDay,
  formatMinutes,
  formatMonth,
  formatRange,
} from "@/lib/format";
import {
  clamp,
  monthEnd,
  monthGrid,
  monthStart,
  VIEWS,
  weekDays,
  weekStart,
  type ViewMode,
} from "@/lib/schedule-view";
import type { StudySession, Subject } from "@/server/db/schema";
import { SessionRow } from "./SessionRow";

const WEEKDAY_LABELS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const sum = (l: StudySession[]) => l.reduce((a, s) => a + s.minutes, 0);
const isDone = (s: StudySession) => s.status === "completed";

interface Props {
  planId: string;
  today: string;
  startDate: string;
  examDate: string;
  mode: ViewMode;
  refDate: string;
  sessions: StudySession[];
  subjects: Subject[];
  canUse: boolean;
}

export function ScheduleSection({
  planId,
  today,
  startDate,
  examDate,
  mode,
  refDate,
  sessions,
  subjects,
  canUse,
}: Props) {
  const last = addDays(examDate, -1); // último dia de estudo
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const colorOf = (s: StudySession) =>
    subjectById.get(s.subjectId)?.color ?? "#2347C9";

  const byDate = new Map<string, StudySession[]>();
  for (const s of sessions) {
    const l = byDate.get(s.date);
    if (l) l.push(s);
    else byDate.set(s.date, [s]);
  }
  const listOf = (d: string) => byDate.get(d) ?? [];

  const href = (m: ViewMode, ref?: string) =>
    `/app/planos/${planId}?visao=${m}${ref && ref !== today ? `&ref=${ref}` : ""}`;

  /** Para onde ir ao trocar de período: hoje, se ele estiver no período; senão o começo dele. */
  const landing = (from: string, to: string) =>
    today >= from && today <= to ? today : clamp(from, startDate, last);

  /* ---------- período atual (rótulo, setas, totais) ---------- */
  let label = "";
  let prev: string | null = null;
  let next: string | null = null;
  let periodDays: string[] = [];

  if (mode === "dia") {
    label = formatDay(refDate);
    prev = refDate > startDate ? addDays(refDate, -1) : null;
    next = refDate < last ? addDays(refDate, 1) : null;
    periodDays = [refDate];
  } else if (mode === "semana") {
    const ws = weekStart(refDate);
    label = formatRange(ws, addDays(ws, 6));
    prev =
      addDays(ws, -1) >= startDate
        ? landing(addDays(ws, -7), addDays(ws, -1))
        : null;
    next =
      addDays(ws, 7) <= last ? landing(addDays(ws, 7), addDays(ws, 13)) : null;
    periodDays = weekDays(refDate);
  } else if (mode === "mes") {
    const ms = monthStart(refDate);
    const me = monthEnd(refDate);
    label = formatMonth(ms);
    prev =
      addDays(ms, -1) >= startDate
        ? landing(monthStart(addDays(ms, -1)), addDays(ms, -1))
        : null;
    next =
      addDays(me, 1) <= last
        ? landing(addDays(me, 1), monthEnd(addDays(me, 1)))
        : null;
    periodDays = monthGrid(refDate)
      .flat()
      .filter((d) => d.startsWith(refDate.slice(0, 7)));
  }
  const periodSessions = periodDays.flatMap(listOf);
  const planned = sum(periodSessions);
  const done = sum(periodSessions.filter(isDone));
  const showBackToToday =
    mode !== "geral" &&
    !periodDays.includes(today) &&
    today >= startDate &&
    today <= last;

  /* ---------- peças reutilizáveis ---------- */
  const row = (s: StudySession) => {
    const subj = subjectById.get(s.subjectId);
    return (
      <SessionRow
        key={s.id}
        id={s.id}
        planId={planId}
        subjectName={subj?.name ?? "Matéria"}
        color={colorOf(s)}
        minutes={s.minutes}
        completed={isDone(s)}
        origin={s.origin}
        reviewOffsetDays={s.reviewOffsetDays}
        disabled={!canUse}
      />
    );
  };

  const dayBlock = (date: string, empty: "box" | "line") => {
    const list = listOf(date);
    const late = date < today && list.some((s) => !isDone(s));
    return (
      <div key={date} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`text-sm font-semibold capitalize ${date === today ? "text-royal-700" : "text-ink-soft"}`}
          >
            {formatDay(date)}
          </p>
          {date === today && (
            <span className="badge bg-royal-100 !px-2 !py-0.5 text-[10px] text-royal-700">
              Hoje
            </span>
          )}
          {late && (
            <span className="badge bg-orange-100 !px-2 !py-0.5 text-[10px] text-warn">
              Atrasado
            </span>
          )}
          {date === examDate && (
            <span className="badge bg-gold-100 !px-2 !py-0.5 text-[10px] text-gold-700">
              Prova 🎯
            </span>
          )}
          {list.length > 0 && (
            <span className="ml-auto text-xs tabular-nums text-ink-soft">
              {formatMinutes(sum(list))}
            </span>
          )}
        </div>
        {list.length > 0 ? (
          list.map(row)
        ) : empty === "box" ? (
          <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-center text-sm text-ink-soft">
            {date === examDate
              ? "Dia da prova. Confie no seu preparo!"
              : "Nada planejado para este dia. Descanso também faz parte do plano. 🌿"}
          </p>
        ) : (
          <p className="px-1 text-sm text-ink-soft">
            {date === examDate
              ? "Dia da prova. Confie no seu preparo!"
              : "Dia livre 🌿"}
          </p>
        )}
      </div>
    );
  };

  const arrow = (dir: "prev" | "next", to: string | null) => {
    const cls =
      "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-xl";
    const sym = dir === "prev" ? "‹" : "›";
    const aria = dir === "prev" ? "Período anterior" : "Próximo período";
    return to ? (
      <Link
        href={href(mode, to)}
        scroll={false}
        aria-label={aria}
        className={`${cls} hover:border-royal-300 hover:bg-royal-50`}
      >
        {sym}
      </Link>
    ) : (
      <span aria-hidden className={`${cls} opacity-30`}>
        {sym}
      </span>
    );
  };

  /* ---------- visão MÊS ---------- */
  const monthView = () => {
    const ym = refDate.slice(0, 7);
    const cell = (date: string) => {
      if (!date.startsWith(ym))
        return <div key={date} className="aspect-square" aria-hidden />;
      const dayNum = Number(date.slice(8));
      const inPlan = date >= startDate && date <= examDate;
      const base =
        "flex aspect-square min-w-0 flex-col items-center justify-center gap-1 rounded-xl border text-sm tabular-nums";
      if (!inPlan)
        return (
          <div
            key={date}
            className={`${base} border-transparent opacity-30`}
            aria-hidden
          >
            {dayNum}
          </div>
        );

      const list = listOf(date);
      const selected = date === refDate;
      const allDone = list.length > 0 && list.every(isDone);
      const late = date < today && list.some((s) => !isDone(s));
      const colors = [...new Set(list.map(colorOf))].slice(0, 3);
      const tone = selected
        ? "border-royal-600 bg-royal-600 font-bold text-white"
        : date === today
          ? "border-royal-500 bg-royal-50 font-bold text-royal-700"
          : "border-line bg-white hover:border-royal-300";

      return (
        <Link
          key={date}
          href={href("mes", date)}
          scroll={false}
          aria-current={selected ? "date" : undefined}
          aria-label={`${formatDay(date)}: ${list.length ? formatMinutes(sum(list)) : "dia livre"}`}
          className={`${base} ${tone}`}
        >
          <span className={late && !selected ? "font-semibold text-warn" : ""}>
            {dayNum}
          </span>
          <span className="flex h-2 items-center gap-0.5" aria-hidden>
            {allDone ? (
              <span
                className={`text-[10px] font-bold leading-none ${selected ? "text-white" : "text-ok"}`}
              >
                ✓
              </span>
            ) : (
              colors.map((c) => (
                <span
                  key={c}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: c }}
                />
              ))
            )}
          </span>
        </Link>
      );
    };

    return (
      <div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          {WEEKDAY_LABELS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {monthGrid(refDate).flat().map(cell)}
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Toque em um dia para ver as sessões. Pontinhos = matérias · ✓ = dia
          concluído · número laranja = tem algo atrasado.
        </p>
        <div className="mt-5">{dayBlock(refDate, "box")}</div>
      </div>
    );
  };

  /* ---------- visão GERAL ---------- */
  const generalView = () => {
    const weeks: string[] = [];
    for (let w = weekStart(startDate); w <= last; w = addDays(w, 7))
      weeks.push(w);

    return (
      <div className="space-y-2">
        {weeks.map((w) => {
          const days = weekDays(w).filter((d) => d >= startDate && d <= last);
          const inWeek = days.flatMap(listOf);
          const wPlanned = sum(inWeek);
          const wDone = sum(inWeek.filter(isDone));
          const current = today >= w && today <= addDays(w, 6);

          return (
            <details
              key={w}
              open={current}
              className="group rounded-2xl border border-line bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold">
                      Semana {formatRange(w, addDays(w, 6))}
                      {current && (
                        <span className="badge ml-2 bg-royal-100 !px-2 !py-0.5 text-[10px] text-royal-700">
                          atual
                        </span>
                      )}
                    </p>
                    <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                      {formatMinutes(wDone)} / {formatMinutes(wPlanned)}
                    </span>
                  </div>
                  <ProgressBar
                    percent={wPlanned ? (wDone / wPlanned) * 100 : 0}
                  />
                </div>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-ink-soft transition group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="border-t border-line px-4 py-2">
                {inWeek.length === 0 ? (
                  <p className="py-2 text-sm text-ink-soft">
                    Sem estudos planejados nesta semana.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {days
                      .filter((d) => listOf(d).length > 0)
                      .map((d) => {
                        const agg = new Map<
                          string,
                          { minutes: number; done: boolean; color: string }
                        >();
                        for (const s of listOf(d)) {
                          const a = agg.get(s.subjectId) ?? {
                            minutes: 0,
                            done: true,
                            color: colorOf(s),
                          };
                          a.minutes += s.minutes;
                          a.done = a.done && isDone(s);
                          agg.set(s.subjectId, a);
                        }
                        return (
                          <li
                            key={d}
                            className="flex flex-col gap-1 py-2.5 sm:flex-row sm:gap-3"
                          >
                            <span
                              className={`text-xs font-semibold capitalize sm:w-28 sm:shrink-0 ${d === today ? "text-royal-700" : "text-ink-soft"}`}
                            >
                              {formatDay(d)}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1 text-sm">
                              {[...agg].map(([id, a]) => (
                                <span
                                  key={id}
                                  className={`inline-flex items-center gap-1.5 ${a.done ? "text-ink-soft line-through" : ""}`}
                                >
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ background: a.color }}
                                  />
                                  {subjectById.get(id)?.name ?? "Matéria"}
                                  <span className="text-xs tabular-nums text-ink-soft">
                                    {formatMinutes(a.minutes)}
                                  </span>
                                </span>
                              ))}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                )}
                <Link
                  href={href("semana", landing(w, addDays(w, 6)))}
                  className="mt-1 inline-block py-2 text-sm font-semibold text-royal-600"
                >
                  Abrir esta semana →
                </Link>
              </div>
            </details>
          );
        })}
      </div>
    );
  };

  /* ---------- render ---------- */
  return (
    <section className="space-y-4" aria-label="Cronograma">
      <h2 className="text-lg font-bold">Cronograma</h2>

      <nav
        aria-label="Modo de visualização"
        className="grid grid-cols-4 gap-1 rounded-2xl bg-paper-2 p-1"
      >
        {VIEWS.map((v) => {
          const active = v.value === mode;
          return (
            <Link
              key={v.value}
              href={href(v.value, refDate)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`rounded-xl px-2 py-2.5 text-center text-sm font-semibold transition ${
                active
                  ? "bg-white text-royal-700 shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {v.label}
            </Link>
          );
        })}
      </nav>

      {mode !== "geral" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {arrow("prev", prev)}
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-base font-bold capitalize">{label}</p>
              <p className="text-xs text-ink-soft">
                {planned > 0
                  ? `${formatMinutes(done)} de ${formatMinutes(planned)}`
                  : "Nada planejado"}
              </p>
            </div>
            {arrow("next", next)}
          </div>
          {showBackToToday && (
            <p className="text-center">
              <Link
                href={href(mode)}
                scroll={false}
                className="text-sm font-semibold text-royal-600"
              >
                Voltar para hoje
              </Link>
            </p>
          )}
        </div>
      )}

      {mode === "dia" && dayBlock(refDate, "box")}
      {mode === "semana" && (
        <div className="space-y-5">
          {weekDays(refDate)
            .filter((d) => d >= startDate && d <= examDate)
            .map((d) => dayBlock(d, "line"))}
        </div>
      )}
      {mode === "mes" && monthView()}
      {mode === "geral" && generalView()}
    </section>
  );
}
