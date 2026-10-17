/**
 * Modelo de cobrança do AprovaSync
 * ────────────────────────────────
 * 1. Teste grátis: 7 dias com tudo liberado (sem cartão).
 * 2. Passe do Edital: pagamento ÚNICO (Pix ou cartão). Libera 1 plano até a prova + 7 dias de carência.
 * 3. Assinatura Mensal: cartão recorrente. Libera planos ilimitados.
 *
 * Por que não "créditos"? O valor central do produto é o botão "Imprevisto". Se cada recálculo
 * consumisse crédito, o usuário hesitaria justamente quando está ansioso — o oposto da proposta.
 * Valores abaixo são pontos de partida: ajuste conforme seus testes de preço.
 */
export const PRICING = {
  currency: 'brl',
  trialDays: 14,
  passGraceDays: 7,
  passMinDays: 30,
  pastDueGraceDays: 3,
  pixExpiresMinutes: 30,
  subscription: {
    id: 'monthly',
    name: 'Assinatura Mensal',
    description: 'Planos ilimitados, Imprevisto ilimitado.',
    amountCents: 1990,
  },
  pass: {
    id: 'pass',
    name: 'Passe do Edital',
    description: 'Um plano completo até a prova (+7 dias). Pagamento único.',
    amountCents: 5990,
  },
} as const;

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
