import type { EditalExtraction } from './types';

export interface PlanPrefill {
  name: string;
  examDate: string | null;
  subjects: { name: string; weight: number; topics: string[] }[];
}

const dedupeKeepFirst = <T,>(items: T[], key: (t: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item).toLowerCase().trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/**
 * Converte o que o modelo extraiu do edital nos campos que o formulário "Novo plano" já usa.
 * Função pura, fácil de testar: nenhuma chamada de rede aqui.
 */
export function mapExtractionToPlanPrefill(extraction: EditalExtraction): PlanPrefill {
  const subjects = dedupeKeepFirst(extraction.materias, (m) => m.nome).map((m) => ({
    name: m.nome.trim().slice(0, 60),
    weight: Math.min(10, Math.max(1, Math.round(m.peso))),
    topics: m.topicos.slice(0, 12),
  }));

  const name = [extraction.cargo, extraction.orgao].filter(Boolean).join(' — ').slice(0, 80) || 'Meu edital';

  return { name, examDate: extraction.dataProva, subjects };
}
