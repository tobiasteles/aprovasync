export interface SubjectDraft {
  name: string;
  weight: number;
}

const toNumber = (v: FormDataEntryValue | null) => Number(String(v ?? '0').replace(',', '.'));

/** Lê av0..av6 (horas, dom..sáb) e devolve minutos. null se algum valor for inválido. */
export function parseAvailability(form: FormData): number[] | null {
  const out: number[] = [];
  for (let i = 0; i < 7; i++) {
    const hours = toNumber(form.get(`av${i}`));
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) return null;
    out.push(Math.round(hours * 60));
  }
  return out;
}

export function parseSubjects(form: FormData): { subjects: SubjectDraft[]; error?: string } {
  const names = form.getAll('subjectName').map((v) => String(v).trim());
  const weights = form.getAll('subjectWeight').map((v) => Number(v));
  const subjects: SubjectDraft[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < names.length; i++) {
    if (!names[i]) continue;
    const weight = Math.round(weights[i] || 1);
    if (weight < 1 || weight > 10) return { subjects: [], error: 'O peso de cada matéria deve ficar entre 1 e 10.' };
    const key = names[i].toLowerCase();
    if (seen.has(key)) return { subjects: [], error: `A matéria "${names[i]}" aparece duas vezes.` };
    seen.add(key);
    subjects.push({ name: names[i].slice(0, 60), weight });
  }
  if (subjects.length === 0) return { subjects: [], error: 'Adicione ao menos uma matéria.' };
  if (subjects.length > 30) return { subjects: [], error: 'Use no máximo 30 matérias por plano.' };
  return { subjects };
}
