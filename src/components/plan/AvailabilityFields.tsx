const DAYS = [
  { index: 1, label: 'Segunda' },
  { index: 2, label: 'Terça' },
  { index: 3, label: 'Quarta' },
  { index: 4, label: 'Quinta' },
  { index: 5, label: 'Sexta' },
  { index: 6, label: 'Sábado' },
  { index: 0, label: 'Domingo' },
];

/** Horas por dia da semana. Valores em HORAS (ex.: 1,5). Índices: 0 = domingo ... 6 = sábado. */
export function AvailabilityFields({ defaultHours = [1, 2, 2, 2, 2, 2, 3] }: { defaultHours?: number[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {DAYS.map((d) => (
        <label key={d.index} className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">{d.label}</span>
          <div className="relative">
            <input
              name={`av${d.index}`}
              type="number"
              inputMode="decimal"
              min={0}
              max={24}
              step={0.5}
              defaultValue={defaultHours[d.index]}
              className="input pr-9"
              aria-label={`Horas de estudo na ${d.label}`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">h</span>
          </div>
        </label>
      ))}
    </div>
  );
}
