import { describe, expect, test } from 'vitest';
import { mapExtractionToPlanPrefill } from '../map-to-plan';
import { MAX_EXTRACTION_CHARS, prepareEditalText } from '../prep';
import { editalExtractionSchema, editalMetaSchema, editalSubjectSchema } from '../types';

const baseExtraction = {
  cargo: 'Agente Administrativo',
  orgao: 'Prefeitura de Exemplo',
  banca: 'FGV',
  vagas: 50,
  salario: 'R$ 4.500,00',
  taxaInscricao: 'R$ 90,00',
  dataProva: '2027-03-15',
  dataInscricaoFim: '2027-01-10',
  resumo: 'Concurso para agente administrativo, com provas objetivas e redação.',
  materias: [
    { nome: 'Língua Portuguesa', peso: 3, topicos: ['Interpretação de texto', 'Crase'] },
    { nome: 'Raciocínio Lógico', peso: 2, topicos: [] },
  ],
};

describe('prepareEditalText', () => {
  test.each([
    ['texto curto passa igual', 'Edital de concurso público.', 'Edital de concurso público.'],
    ['normaliza \\r\\n', 'Linha 1\r\nLinha 2', 'Linha 1\nLinha 2'],
    ['colapsa espaços múltiplos', 'muitos   espaços    aqui', 'muitos espaços aqui'],
    ['colapsa 3+ quebras de linha em 2', 'A\n\n\n\nB', 'A\n\nB'],
    ['remove espaços nas pontas', '   com espaço nas pontas   ', 'com espaço nas pontas'],
  ])('%s', (_label, input, expected) => {
    expect(prepareEditalText(input).text).toBe(expected);
  });

  test('não trunca texto dentro do limite', () => {
    const r = prepareEditalText('a'.repeat(1000), 5000);
    expect(r.truncated).toBe(false);
    expect(r.text.length).toBe(1000);
  });

  test('trunca texto acima do limite e avisa', () => {
    const r = prepareEditalText('a'.repeat(5000), 1000);
    expect(r.truncated).toBe(true);
    expect(r.text.length).toBe(1000);
    expect(r.originalChars).toBe(5000);
  });

  test('usa o limite padrão quando nenhum é passado', () => {
    const r = prepareEditalText('a'.repeat(MAX_EXTRACTION_CHARS + 1));
    expect(r.truncated).toBe(true);
  });
});

describe('schemas de validação', () => {
  test('aceita uma extração completa e válida', () => {
    expect(editalExtractionSchema.safeParse(baseExtraction).success).toBe(true);
  });

  test.each([
    ['sem matérias', { ...baseExtraction, materias: [] }],
    ['peso fora do intervalo (0)', { ...baseExtraction, materias: [{ nome: 'X', peso: 0, topicos: [] }] }],
    ['peso fora do intervalo (11)', { ...baseExtraction, materias: [{ nome: 'X', peso: 11, topicos: [] }] }],
    ['data da prova em formato errado', { ...baseExtraction, dataProva: '15/03/2027' }],
    ['resumo vazio', { ...baseExtraction, resumo: '' }],
    ['matéria sem nome', { ...baseExtraction, materias: [{ nome: '', peso: 3, topicos: [] }] }],
  ])('rejeita: %s', (_label, bad) => {
    expect(editalExtractionSchema.safeParse(bad).success).toBe(false);
  });

  test('datas nulas são aceitas (edital pode não deixar claro)', () => {
    expect(editalMetaSchema.safeParse({ ...baseExtraction, dataProva: null, dataInscricaoFim: null }).success).toBe(true);
  });

  test('tópicos ausentes viram lista vazia por padrão', () => {
    const parsed = editalSubjectSchema.parse({ nome: 'Direito', peso: 4 });
    expect(parsed.topicos).toEqual([]);
  });
});

describe('mapExtractionToPlanPrefill', () => {
  test('monta o nome do plano a partir de cargo + órgão', () => {
    const r = mapExtractionToPlanPrefill(baseExtraction);
    expect(r.name).toBe('Agente Administrativo — Prefeitura de Exemplo');
    expect(r.examDate).toBe('2027-03-15');
  });

  test('usa só o que existe quando falta cargo ou órgão', () => {
    expect(mapExtractionToPlanPrefill({ ...baseExtraction, orgao: null }).name).toBe('Agente Administrativo');
    expect(mapExtractionToPlanPrefill({ ...baseExtraction, cargo: null, orgao: null }).name).toBe('Meu edital');
  });

  test('remove matérias duplicadas (mesmo nome, case-insensitive), mantendo a primeira', () => {
    const r = mapExtractionToPlanPrefill({
      ...baseExtraction,
      materias: [
        { nome: 'Português', peso: 3, topicos: ['A'] },
        { nome: 'português', peso: 5, topicos: ['B'] },
        { nome: 'Matemática', peso: 2, topicos: [] },
      ],
    });
    expect(r.subjects.map((s) => s.name)).toEqual(['Português', 'Matemática']);
    expect(r.subjects[0].topics).toEqual(['A']);
  });

  test('arredonda e limita o peso entre 1 e 10', () => {
    const r = mapExtractionToPlanPrefill({
      ...baseExtraction,
      materias: [
        { nome: 'A', peso: 1, topicos: [] },
        { nome: 'B', peso: 10, topicos: [] },
      ],
    });
    expect(r.subjects.map((s) => s.weight)).toEqual([1, 10]);
  });

  test('corta tópicos em 12 e nomes de matéria em 60 caracteres', () => {
    const r = mapExtractionToPlanPrefill({
      ...baseExtraction,
      materias: [{ nome: 'X'.repeat(100), peso: 3, topicos: Array.from({ length: 20 }, (_, i) => `t${i}`) }],
    });
    expect(r.subjects[0].name.length).toBe(60);
    expect(r.subjects[0].topics).toHaveLength(12);
  });
});
