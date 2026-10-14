import { ScheduleError, type ISODate } from './shared';

/**
 * Aritmética de datas em UTC puro, sobre strings 'YYYY-MM-DD'.
 * Evita fuso/horário de verão e trata anos bissextos corretamente (2100 NÃO é bissexto, 2000 é).
 */
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function toUTC(date: ISODate): number {
  const m = ISO.exec(date);
  if (!m) throw new ScheduleError('INVALID_DATE', `Data inválida: "${date}". Use YYYY-MM-DD.`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  // Rejeita datas que "rolam" (ex.: 2023-02-29 viraria 2023-03-01).
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
    throw new ScheduleError('INVALID_DATE', `Data inexistente: "${date}".`);
  }
  return t;
}

export function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY_MS);
}

/** Dias entre duas datas (b - a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** 0 = domingo ... 6 = sábado. */
export function weekdayOf(date: ISODate): number {
  return new Date(toUTC(date)).getUTCDay();
}

/** Lista [start, endExclusive). Retorna [] se start >= endExclusive (mas valida as duas datas). */
export function listDays(start: ISODate, endExclusive: ISODate): ISODate[] {
  const s = toUTC(start);
  const e = toUTC(endExclusive);
  const out: ISODate[] = [];
  for (let t = s; t < e; t += DAY_MS) out.push(fromUTC(t));
  return out;
}
