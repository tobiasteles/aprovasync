# AprovaSync — do zero até cobrando

O projeto já vem com **cartão e assinatura (Stripe)** e **Pix (Mercado Pago)** integrados e a cobrança **ligada**. Este guia leva você de "baixei o zip" até "recebi o primeiro pagamento".
Tempo: ~2 a 3 horas, a maior parte esperando verificação de contas.

> O Pix é processado pelo **Mercado Pago** (grupo Mercado Livre). É nele que você cria a conta.

---
## Parte 1 — Instalar no seu computador
1. Instale o **Node.js 20.9+** (nodejs.org → LTS), o **Git** (git-scm.com) e o **VS Code**.
2. Descompacte o `aprovasync.zip`, abra a pasta no VS Code e rode no terminal:
```bash
npm install
cp .env.example .env.local      # Windows (PowerShell): Copy-Item .env.example .env.local
```
Todas as chaves abaixo vão em `.env.local`. **Nunca** suba esse arquivo para o GitHub (já está no `.gitignore`).

## Parte 2 — Criar as contas
| Conta | Para quê | |
|---|---|---|
| **Neon** · neon.tech | Banco de dados | obrigatória |
| **Stripe** · stripe.com/br | Cartão e assinatura | obrigatória |
| **Mercado Pago** · mercadopago.com.br | Pix | obrigatória |
| **GitHub** · github.com | Guardar o código | obrigatória |
| **Vercel** · vercel.com | Colocar no ar | obrigatória |
| **Resend** · resend.com | E-mail de "esqueci minha senha" | recomendada |
| **Upstash** · upstash.com | Limite de tentativas de login | recomendada |

## Parte 3 — Pegar as chaves (uma por uma)
> Os nomes dos menus mudam de vez em quando. Se não achar, procure o termo em **negrito**.

### 3.1 `AUTH_SECRET`
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Cole o resultado em `AUTH_SECRET=`. (Em produção use outro valor.)

### 3.2 `DATABASE_URL` (Neon)
1. **console.neon.tech → New Project**, região **São Paulo**.
2. Clique em **Connect**, marque **Pooled connection** e copie a string (`postgresql://...?sslmode=require`).
3. Cole em `DATABASE_URL=`.
4. Dica: deixe a branch `main` como **produção** e crie uma branch `dev` (**Branches → Create branch**) para usar no `.env.local`.

### 3.3 Stripe (`STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`)
1. Em **dashboard.stripe.com**, deixe o **modo de teste** ligado (alternador no topo).
2. **Developers → API keys** → copie a **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY=`. (A *Publishable key* não é usada.)
3. Webhook local (para testar no seu computador):
   - Instale o **Stripe CLI** (docs.stripe.com/stripe-cli) e rode `stripe login`.
   - Em um terminal separado, deixe rodando: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Ele mostra um `whsec_...` → `STRIPE_WEBHOOK_SECRET=`.
4. **Portal do cliente** (botão "Gerenciar assinatura"): **Settings → Billing → Customer portal** → ative e salve. (Precisa ser feito de novo no modo real, na Parte 8.)

### 3.4 Mercado Pago (`MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`)
1. Faça login em **mercadopago.com.br/developers → Suas integrações → Criar aplicação** (tipo *Pagamentos online*).
2. Na aplicação, abra **Credenciais de produção** (pode exigir verificar a conta) e copie o **Access Token** (`APP_USR-...`) → `MERCADOPAGO_ACCESS_TOKEN=`.
3. O segredo do webhook (`MERCADOPAGO_WEBHOOK_SECRET`) você pega na **Parte 7**, depois de ter a URL do site no ar. Por enquanto deixe vazio (em desenvolvimento funciona sem).

### 3.5 E-mail e limite de tentativas (recomendados)
- **Resend:** *Domains → Add Domain* e crie os registros DNS que ele pedir; depois *API Keys → Create* → `RESEND_API_KEY=`; `EMAIL_FROM="AprovaSync <nao-responda@seudominio.com.br>"`. **Sem isso, o "esqueci minha senha" não envia e-mail em produção.**
- **Upstash:** *Create Database* (Redis) → aba **REST API** → `UPSTASH_REDIS_REST_URL=` e `UPSTASH_REDIS_REST_TOKEN=`.

## Parte 4 — Seu `.env.local` completo
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_SECRET=...
DATABASE_URL=postgresql://...

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=

RESEND_API_KEY=
EMAIL_FROM=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Aparece nos Termos e na Privacidade (preencha com o que tiver; o resto você ajusta depois)
NEXT_PUBLIC_COMPANY_NAME=Seu Nome ou Razão Social
NEXT_PUBLIC_COMPANY_CPF=000.000.000-00      # ou use NEXT_PUBLIC_COMPANY_CNPJ=
NEXT_PUBLIC_COMPANY_ADDRESS=
NEXT_PUBLIC_CONTACT_EMAIL=
NEXT_PUBLIC_FORUM_CITY=
```
Não existe a linha `NEXT_PUBLIC_BETA_MODE`: **sem ela, a cobrança fica ligada.**

## Parte 5 — Testar tudo no seu computador
Abra **dois terminais**:
```bash
# Terminal 1
npm run db:migrate          # cria as tabelas (só na primeira vez)
npm run dev                 # http://localhost:3000

# Terminal 2
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Roteiro de teste:
1. **Criar conta** → montar um plano → marcar estudo → **"Tive um imprevisto"**.
2. Vá em **Assinatura**.
3. **Assinatura mensal (cartão):** clique em *Assinar* → cartão de teste `4242 4242 4242 4242`, data futura, CVC qualquer → volte ao site: deve aparecer **"Assinante"** no topo. Teste também **Gerenciar assinatura**.
4. **Passe do Edital por cartão:** escolha o plano → *Pagar com cartão* → mesmo cartão de teste → o plano abre liberado.
5. **Passe do Edital por Pix:** *Pagar com Pix* → aparece o QR Code e o "copia e cola". O pagamento real só pode ser testado com dinheiro de verdade (veja Parte 8).
6. **Simular fim do teste grátis:** no banco (`npm run db:studio`), mude `created_at` do seu usuário para 10 dias atrás e confirme que o site pede pagamento.
7. `npm test` → todos os testes devem passar.

## Parte 6 — Colocar no ar
**6.1 GitHub (repositório PRIVADO)**
```bash
git init
git add .
git commit -m "AprovaSync"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/aprovasync.git
git push -u origin main
```
**6.2 Vercel**
1. **Add New → Project** → importe o repositório (Next.js é detectado sozinho).
2. Em **Environment Variables**, cadastre **todas** as variáveis da Parte 4, mas:
   - `NEXT_PUBLIC_APP_URL` = o endereço do site (ex.: `https://aprovasync.vercel.app`, ou seu domínio);
   - `AUTH_SECRET` = um valor **novo**;
   - `DATABASE_URL` = a string da branch **main** (produção) do Neon;
   - por enquanto mantenha as chaves **de teste** do Stripe.
3. **Deploy**.
4. Crie as tabelas no banco de produção (uma vez, do seu computador):
```bash
DATABASE_URL="url-neon-producao" npm run db:migrate         # PowerShell: $env:DATABASE_URL="..."; npm run db:migrate
```
**6.3 Domínio próprio (opcional agora):** registre em registro.br → Vercel **Settings → Domains** → atualize `NEXT_PUBLIC_APP_URL` → **Redeploy**.

## Parte 7 — Webhooks de produção
É o que avisa o seu site de que um pagamento foi aprovado.

**Stripe**
1. **Developers → Webhooks → Add endpoint**.
2. URL: `https://SEU-SITE/api/webhooks/stripe`
3. Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Criado o endpoint, clique em **Reveal** no *Signing secret* (`whsec_...`) → Vercel: `STRIPE_WEBHOOK_SECRET`.

**Mercado Pago**
1. Na sua aplicação: **Webhooks → Configurar notificações**.
2. URL de produção: `https://SEU-SITE/api/webhooks/mercadopago`
3. Evento: **Pagamentos**. Salve.
4. Copie a **Assinatura secreta** → Vercel: `MERCADOPAGO_WEBHOOK_SECRET`.

Depois de cadastrar os segredos: **Vercel → Deployments → Redeploy**.

## Parte 8 — Virar a chave para dinheiro de verdade
1. **Stripe:** em **Ativar conta / Activate your account**, preencha os dados de quem vai receber (pessoa física com CPF ou empresa com CNPJ) e a **conta bancária** (precisa estar no mesmo CPF/CNPJ). Aguarde a aprovação.
2. Desligue o **modo de teste** no Stripe e repita **no modo real**: pegue a `sk_live_...`, crie o **webhook de novo** (Parte 7) com o novo `whsec_...` e ative o **Customer portal** (3.3, item 4).
3. **Mercado Pago:** conta verificada e **chave Pix** cadastrada; use as **credenciais de produção** (`APP_USR-...`).
4. Na Vercel, troque para as chaves reais (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`) e faça **Redeploy**.
5. **Teste com dinheiro de verdade (R$ 1,00):**
   - Em `src/core/billing/pricing.ts`, troque `amountCents: 5990` por `100` (só no Passe), faça commit e push.
   - Pague o Passe com **Pix** (no seu app do banco) e com **cartão**. Confirme que o plano liberou nos dois casos.
   - Estorne os pagamentos de teste (Stripe: *Payments → Refund*; Mercado Pago: *Atividades → Devolver*).
   - Volte para `5990`, commit e push.
6. Confira os envios: no Stripe, **Developers → Webhooks → seu endpoint → Events** (tudo "Succeeded"); no Mercado Pago, o painel de **Webhooks → Notificações**.
Pronto: você está cobrando.

## Parte 9 — Dia a dia
- **Mudar preços/textos:** `src/core/billing/pricing.ts` (Passe: `pass.amountCents`; Assinatura: `subscription.amountCents`; em centavos). Push para o GitHub e a Vercel publica sozinha. Assinaturas já ativas mantêm o preço antigo.
- **Ver o dinheiro:** Stripe → *Payouts* (cai na conta bancária cadastrada); Mercado Pago → saldo da conta (transfira por Pix).
- **Ver usuários e pagamentos:** `npm run db:studio` (usando a `DATABASE_URL` de produção) ou o painel SQL do Neon.
- **Reembolso de 7 dias** (já prometido nos Termos): faça o estorno no Stripe/Mercado Pago. Para encerrar o acesso do Passe, apague a linha em `plan_licenses`.

## Parte 10 — Se algo der errado
| Sintoma | Causa provável |
|---|---|
| Pagou e o plano não liberou (cartão) | Webhook do Stripe não cadastrado, `STRIPE_WEBHOOK_SECRET` errado, ou ambiente (teste/real) misturado |
| Pagou o Pix e não liberou | A tela do Pix confirma sozinha a cada 4 s; se não, confira o webhook do Mercado Pago e o `MERCADOPAGO_WEBHOOK_SECRET` |
| Erro 500 só em produção | Faltou variável na Vercel ou não rodou `db:migrate` no banco de produção |
| "Esqueci minha senha" não chega | Sem `RESEND_API_KEY` ou `EMAIL_FROM` fora do domínio verificado |
| Termos mostram `[... — preencher]` | Variáveis `NEXT_PUBLIC_COMPANY_*` vazias **no momento do build**: preencha e faça Redeploy |
| Erro ao criar Pix | Access Token errado/de teste, ou conta do Mercado Pago sem verificação/chave Pix |

---
## Para depois (sem pressa)
- **Termos, Privacidade, CNPJ e nota fiscal:** as páginas legais já existem e funcionam; os detalhes do que revisar e como abrir a empresa estão em `docs/CONFORMIDADE.md`.
- **Se começou no CPF e abrir CNPJ depois:** crie nova conta Stripe e novas credenciais do Mercado Pago, troque as chaves na Vercel e atualize as variáveis `NEXT_PUBLIC_COMPANY_*`. Pelos relatos que encontrei, o Stripe não converte conta de pessoa física em empresa; assinaturas ativas precisam ser migradas com o suporte deles.
- **Quer testar de graça com poucas pessoas antes?** Existe o modo beta: `NEXT_PUBLIC_BETA_MODE=true` desliga os pagamentos. É opcional.
