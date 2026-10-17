/** Limite de caracteres de texto enviados ao modelo (controla custo e fica dentro da janela de contexto). */
export const MAX_EXTRACTION_CHARS = 60_000;
export const MIN_EXTRACTION_CHARS = 200;

export interface PreparedText {
  text: string;
  truncated: boolean;
  originalChars: number;
}

/** Normaliza espaços/quebras de linha do texto extraído do PDF e corta no limite de caracteres. */
export function prepareEditalText(raw: string, maxChars: number = MAX_EXTRACTION_CHARS): PreparedText {
  const normalized = raw.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (normalized.length <= maxChars) {
    return { text: normalized, truncated: false, originalChars: normalized.length };
  }
  return { text: normalized.slice(0, maxChars), truncated: true, originalChars: normalized.length };
}
