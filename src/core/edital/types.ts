import { z } from 'zod';

/**
 * Formato estruturado que extraímos de um edital em PDF. Tudo opcional exceto "resumo" e
 * "materias": nem todo edital declara vagas/salário de forma clara, e preferimos devolver
 * o que der certo a falhar a extração inteira por causa de um campo que faltou.
 */
export const editalSubjectSchema = z.object({
  nome: z.string().min(1).max(80),
  /** Peso relativo (1–10), estimado a partir do nº de questões/pontos quando o edital informa. */
  peso: z.number().int().min(1).max(10),
  /** Tópicos-chave do conteúdo programático dessa matéria, em poucas palavras cada. */
  topicos: z.array(z.string().min(1).max(120)).max(25).default([]),
});

export const editalMetaSchema = z.object({
  cargo: z.string().max(140).nullable(),
  orgao: z.string().max(140).nullable(),
  banca: z.string().max(80).nullable(),
  vagas: z.number().int().nonnegative().nullable(),
  salario: z.string().max(60).nullable(),
  taxaInscricao: z.string().max(40).nullable(),
  /** ISO 'YYYY-MM-DD' quando o edital deixa a data clara; null quando não dá para ter certeza. */
  dataProva: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  dataInscricaoFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  /** 2 a 4 frases, em linguagem simples, nunca um trecho copiado do PDF. */
  resumo: z.string().min(1).max(900),
});

export const editalExtractionSchema = editalMetaSchema.extend({
  materias: z.array(editalSubjectSchema).min(1).max(40),
});

export type EditalSubject = z.infer<typeof editalSubjectSchema>;
export type EditalMeta = z.infer<typeof editalMetaSchema>;
export type EditalExtraction = z.infer<typeof editalExtractionSchema>;
