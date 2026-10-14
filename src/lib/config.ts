/**
 * Modo beta: acesso gratuito para todos, sem preços nem pagamentos.
 * Ligue com NEXT_PUBLIC_BETA_MODE=true. Desligue (remova a variável) quando for começar a cobrar.
 * Variáveis NEXT_PUBLIC_* entram no build: mudou, faça novo deploy.
 */
export const isBeta = (): boolean => process.env.NEXT_PUBLIC_BETA_MODE === 'true';
