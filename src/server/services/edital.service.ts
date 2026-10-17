import 'server-only';
import { mapExtractionToPlanPrefill, prepareEditalText, type EditalExtraction, type PlanPrefill } from '@/core/edital';
import { extractEditalStructure, EditalExtractionError } from '../edital/claude';
import { extractPdfText, PdfTextError } from '../edital/pdf-text';

export { EditalExtractionError, PdfTextError };

export const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

export interface EditalParseResult {
  extraction: EditalExtraction;
  prefill: PlanPrefill;
  truncated: boolean;
}

export async function parseEditalPdf(bytes: Uint8Array): Promise<EditalParseResult> {
  const rawText = await extractPdfText(bytes);
  const { text, truncated } = prepareEditalText(rawText);
  const extraction = await extractEditalStructure(text, truncated);
  return { extraction, prefill: mapExtractionToPlanPrefill(extraction), truncated };
}
