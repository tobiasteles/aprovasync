import 'server-only';
import { editalExtractionSchema, type EditalExtraction } from '@/core/edital';
import { env } from '@/lib/env';

/**
 * Modelo usado para estruturar o edital. 'claude-haiku-5-5' é o suficiente (é extração/classificação,
 * não raciocínio aberto) e mais barato; troque para 'claude-sonnet-5-5' se os editais que você recebe
 * forem muito longos ou confusos e a qualidade da extração não estiver satisfatória.
 */
const EXTRACTION_MODEL = 'claude-haiku-5-5';

const EXTRACTION_TOOL = {
  name: 'registrar_edital',
  description: 'Registra as informações estruturadas extraídas de um edital de concurso público.',
  input_schema: {
    type: 'object' as const,
    properties: {
      cargo: { type: ['string', 'null'], description: 'Nome do cargo/vaga do edital.' },
      orgao: { type: ['string', 'null'], description: 'Órgão ou instituição responsável pelo concurso.' },
      banca: { type: ['string', 'null'], description: 'Banca organizadora, se identificável.' },
      vagas: { type: ['integer', 'null'], description: 'Número total de vagas, se declarado.' },
      salario: { type: ['string', 'null'], description: 'Remuneração inicial, como texto (ex.: "R$ 4.500,00").' },
      taxaInscricao: { type: ['string', 'null'], description: 'Valor da taxa de inscrição, como texto.' },
      dataProva: { type: ['string', 'null'], description: 'Data da prova objetiva em formato YYYY-MM-DD, só se o edital deixar claro.' },
      dataInscricaoFim: { type: ['string', 'null'], description: 'Data final das inscrições em formato YYYY-MM-DD, só se clara.' },
      resumo: {
        type: 'string',
        description: 'De 2 a 4 frases em português, em linguagem simples e NAS SUAS PRÓPRIAS PALAVRAS (nunca copiando frases do edital), explicando do que se trata o concurso.',
      },
      materias: {
        type: 'array',
        description: 'Lista de matérias do conteúdo programático, com peso relativo estimado.',
        items: {
          type: 'object',
          properties: {
            nome: { type: 'string', description: 'Nome da matéria, como aparece no edital (ex.: "Língua Portuguesa").' },
            peso: {
              type: 'integer',
              description: 'Peso relativo de 1 a 10. Se o edital informar número de questões ou pontos por matéria, baseie o peso nisso (mais questões = peso maior). Sem essa informação, estime pela ordem/ênfase do edital.',
            },
            topicos: {
              type: 'array',
              items: { type: 'string' },
              description: 'Até 12 tópicos-chave do conteúdo programático dessa matéria, cada um bem curto (poucas palavras).',
            },
          },
          required: ['nome', 'peso'],
        },
      },
    },
    required: ['cargo', 'orgao', 'banca', 'vagas', 'salario', 'taxaInscricao', 'dataProva', 'dataInscricaoFim', 'resumo', 'materias'],
  },
};

export class EditalExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EditalExtractionError';
  }
}

/**
 * Pede ao modelo para estruturar o texto do edital via tool use (saída confiável, sem parsing de texto livre).
 * Lança EditalExtractionError com mensagens seguras para mostrar à pessoa.
 */
export async function extractEditalStructure(text: string, truncated: boolean): Promise<EditalExtraction> {
  const system = `Você lê editais de concurso público brasileiros e extrai as informações pedidas através da ferramenta "registrar_edital". Nunca copie frases inteiras do edital no campo "resumo": escreva com suas próprias palavras. Se um dado não estiver claro no texto, use null em vez de adivinhar.${
    truncated ? ' O texto foi cortado por ser muito longo; baseie-se no que está disponível.' : ''
  }`;

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EXTRACTION_MODEL,
        max_tokens: 4000,
        system,
        messages: [{ role: 'user', content: `Texto extraído do edital em PDF:\n\n${text}` }],
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: 'tool', name: 'registrar_edital' },
      }),
    });
  } catch {
    throw new EditalExtractionError('Não conseguimos conectar ao serviço de leitura agora. Tente de novo em instantes.');
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('[edital] Anthropic API', response.status, body);
    if (response.status === 429) throw new EditalExtractionError('Muitos editais sendo processados agora. Tente de novo em um minuto.');
    throw new EditalExtractionError('Não conseguimos ler este edital agora. Tente de novo em instantes.');
  }

  const data = await response.json();
  const toolUse = (data.content as Array<{ type: string; input?: unknown }> | undefined)?.find((b) => b.type === 'tool_use');
  if (!toolUse) throw new EditalExtractionError('Não conseguimos estruturar este edital. Tente preencher manualmente.');

  const parsed = editalExtractionSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    console.error('[edital] validação falhou', parsed.error.flatten());
    throw new EditalExtractionError('O edital veio em um formato que não reconhecemos bem. Confira os dados antes de continuar.');
  }
  return parsed.data;
}
