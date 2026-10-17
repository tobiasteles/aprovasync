import 'server-only';

export class PdfTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfTextError';
  }
}

/** Extrai o texto de um PDF. Lança PdfTextError com mensagem já adequada para mostrar ao usuário. */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    const text = result.text?.trim() ?? '';
    if (!text) throw new PdfTextError('Não conseguimos ler texto neste PDF. Ele pode ser uma imagem escaneada sem OCR.');
    return text;
  } catch (e) {
    if (e instanceof PdfTextError) throw e;
    throw new PdfTextError('Não conseguimos abrir este arquivo. Confira se é um PDF válido.');
  } finally {
    await parser.destroy();
  }
}
