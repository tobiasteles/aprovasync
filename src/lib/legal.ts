/**
 * Dados da empresa exibidos nos Termos e na Política de Privacidade.
 * Defina no .env (NEXT_PUBLIC_*) ANTES de publicar. Enquanto houver "[...]", o ambiente de
 * desenvolvimento mostra um aviso nas páginas legais.
 */
export const LEGAL = {
  /** Pessoa física: seu nome completo. Pessoa jurídica: a razão social. */
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || '[NOME COMPLETO ou RAZÃO SOCIAL — preencher]',
  /** Pessoa jurídica: preencha o CNPJ. Pessoa física: preencha o CPF (obrigatório exibir no site). */
  taxIdLabel: process.env.NEXT_PUBLIC_COMPANY_CNPJ ? 'CNPJ' : 'CPF',
  taxId: process.env.NEXT_PUBLIC_COMPANY_CNPJ || process.env.NEXT_PUBLIC_COMPANY_CPF || '[CPF ou CNPJ — preencher]',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '[ENDEREÇO — preencher]',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '[E-MAIL DE CONTATO — preencher]',
  dpoName: process.env.NEXT_PUBLIC_DPO_NAME || '',
  forumCity: process.env.NEXT_PUBLIC_FORUM_CITY || '[CIDADE/UF — preencher]',
  /** Versão exibida e gravada no aceite. Aumente quando alterar o conteúdo dos documentos. */
  version: '2026-10-13',
  updatedAtLabel: '13 de outubro de 2026',
} as const;

export const hasLegalPlaceholders = () =>
  [LEGAL.companyName, LEGAL.taxId, LEGAL.address, LEGAL.contactEmail, LEGAL.forumCity].some((v) => v.startsWith('['));
