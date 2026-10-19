import { addDays, toUTC, weekdayOf, type ISODate } from "@/core/schedule";

export type ViewMode = "dia" | "semana" | "mes" | "geral";

export const VIEWS: { value: ViewMode; label: string }[] = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "geral", label: "Geral" },
];

export function parseView(raw?: string): ViewMode {
  return VIEWS.some((v) => v.value === raw) ? (raw as ViewMode) : "dia";
}

/** Lê ?ref=YYYY-MM-DD; se vier lixo, usa o fallback. */
export function parseRef(raw: string | undefined, fallback: ISODate): ISODate {
  if (!raw) return fallback;
  try {
    toUTC(raw);
    return raw;
  } catch {
    return fallback;
  }
}

export const clamp = (d: ISODate, min: ISODate, max: ISODate): ISODate =>
  d < min ? min : d > max ? max : d;

/** Semana de segunda a domingo (mesma ordem do formulário de horas). */
export const weekStart = (d: ISODate): ISODate =>
  addDays(d, -((weekdayOf(d) + 6) % 7));
export const weekDays = (d: ISODate): ISODate[] => {
  const s = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
};

export const monthStart = (d: ISODate): ISODate => `${d.slice(0, 7)}-01`;

export function addMonths(d: ISODate, n: number): ISODate {
  const [y, m] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}

export const monthEnd = (d: ISODate): ISODate => addDays(addMonths(d, 1), -1);

/** Semanas (linhas de 7 dias) que cobrem o mês inteiro, de segunda a domingo. */
export function monthGrid(d: ISODate): ISODate[][] {
  const start = weekStart(monthStart(d));
  const end = addDays(weekStart(monthEnd(d)), 6);
  const weeks: ISODate[][] = [];
  for (let w = start; w <= end; w = addDays(w, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
  }
  return weeks;
}
