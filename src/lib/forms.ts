export interface SubjectDraft {
  name: string;
  weight: number;
  topics?: string[];
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
  const topicsRaw = form.getAll('subjectTopics').map((v) => String(v));
  const subjects: SubjectDraft[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < names.length; i++) {
    if (!names[i]) continue;
    const weight = Math.round(weights[i] || 1);
    if (weight < 1 || weight > 10) return { subjects: [], error: 'O peso de cada matéria deve ficar entre 1 e 10.' };
    const key = names[i].toLowerCase();
    if (seen.has(key)) return { subjects: [], error: `A matéria "${names[i]}" aparece duas vezes.` };
    seen.add(key);
    const topics = parseTopics(topicsRaw[i]);
    subjects.push({ name: names[i].slice(0, 60), weight, topics });
  }
  if (subjects.length === 0) return { subjects: [], error: 'Adicione ao menos uma matéria.' };
  if (subjects.length > 30) return { subjects: [], error: 'Use no máximo 30 matérias por plano.' };
  return { subjects };
}

function parseTopics(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return undefined;
    return arr.map((t) => String(t).slice(0, 120)).slice(0, 12);
  } catch {
    return undefined;
  }
}

/** Lê o resumo do edital (hidden input JSON), se o plano nasceu de um PDF. */
export function parseEditalMeta(form: FormData): import('@/core/edital').EditalMeta | undefined {
  const raw = form.get('editalMeta');
  if (!raw) return undefined;
  try {
    return JSON.parse(String(raw));
  } catch {
    return undefined;
  }
}
