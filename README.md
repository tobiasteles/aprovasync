# AprovaSync

Cronograma de estudos adaptativo para concursos e ENEM. Perdeu um dia? O botão **Imprevisto** redistribui a matéria atrasada até a data da prova, sem ultrapassar o limite diário.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · Drizzle + Neon (Postgres) · Stripe (cartão) · Mercado Pago (Pix) · Vitest.

**Comece por `docs/PASSO-A-PASSO.md`** (instalar, pegar as chaves, testar, publicar e cobrar). Referências: **`docs/SETUP.md`** (instalação + chaves), depois **`docs/CONFORMIDADE.md`** (CNPJ, nota fiscal, LGPD, e-mail, backup, Sentry) e **`docs/IDENTIDADE.md`** (marca).

## Modo beta (opcional)
`NEXT_PUBLIC_BETA_MODE=true` libera tudo de graça, esconde preços e desliga Stripe e Mercado Pago; os Termos e a Privacidade se adaptam sozinhos (inclusive para pessoa física, com nome e CPF). Remova a variável e faça novo deploy quando for cobrar.

## Como cobra (quando o beta terminar)
| Oferta | Preço (ajustável em `src/core/billing/pricing.ts`) | Pagamento |
|---|---|---|
| Teste grátis | 7 dias, tudo liberado, sem cartão | — |
| **Passe do Edital** | R$ 59,90 único · 1 plano até a prova + 7 dias | Pix (Mercado Pago) ou cartão (Stripe) |
| **Assinatura Mensal** | R$ 19,90/mês · planos ilimitados | Cartão recorrente (Stripe) |

*Por que não créditos?* O Imprevisto é o valor central; cobrar por uso faria o aluno ansioso hesitar justamente quando mais precisa. Pix também não renova sozinho, então ele vende o Passe (pagamento único) e o cartão cobre a recorrência.

## Estrutura
```
src/
├─ core/            domínio PURO (sem React/DB/Date.now) — 152 testes
│  ├─ schedule/     generate · recalculate · progress · dates
│  └─ billing/      pricing · access (quem pode usar o quê) · webhooks (assinatura MP, status Stripe)
├─ server/          db (schema Drizzle) · services · actions · integrações (stripe, mercadopago)
├─ app/             páginas: landing, entrar/cadastro, /app (painel, plano, assinatura, Pix) e /api (webhooks)
├─ components/      brand · ui · plan · billing
└─ lib/             auth (JWT em cookie httpOnly) · env · today (fuso de Brasília) · forms
```

## Decisões que valem saber
- **Folga de 15%** no plano: sem ela o Imprevisto não teria onde encaixar o atraso.
- **Imprevisto é atômico e honesto:** se o atraso não couber até a prova, nada é alterado; o app mostra quantas horas faltam e oferece ajustar as horas por dia.
- **Webhooks idempotentes** e o Mercado Pago é sempre reconsultado na API (o corpo da notificação não é confiável sozinho).
- **Auth própria e simples** (e-mail + senha com bcrypt, sessão JWT de 30 dias). Troque por Better Auth/Auth.js se quiser login com Google.

## O que foi verificado e o que não foi
Verificado: 152 testes, `tsc`, `next build`, servidor no ar (páginas públicas, redirecionamento de rota protegida, webhooks rejeitando assinatura inválida), migration aplicada em Postgres real com constraints, e as queries críticas (agregação do painel, upserts, idempotência).
**Não verificado:** chamadas reais ao Stripe e ao Mercado Pago (exigem as suas chaves) e o fluxo completo no navegador com banco do Neon. Faça o teste da seção 5.4 / 7 do SETUP antes de abrir ao público.

## Conformidade e segurança (incluídas)
Termos de Uso e Privacidade (`/termos`, `/privacidade`) com aceite versionado · baixar/excluir dados (LGPD) em `/app/conta` · recuperação de senha por e-mail (token de uso único, 60 min) · limite de tentativas (Upstash, com fallback) · Sentry sem dados pessoais · backup semanal criptografado (GitHub Actions).

## Ainda não incluído
Verificação de e-mail no cadastro, login social, catálogo de editais pré-prontos, emissão automática de NFS-e, painel administrativo.
