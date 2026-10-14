export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

export function formatDay(iso: string, withWeekday = true): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: withWeekday ? 'short' : undefined,
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function formatDateLong(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
}
