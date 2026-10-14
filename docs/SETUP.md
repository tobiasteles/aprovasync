# Passo a passo: instalação e chaves de API

> Os nomes de menus nos painéis do Neon, Stripe e Mercado Pago mudam de tempos em tempos. Se algo não estiver exatamente onde descrevi, procure pelo termo em negrito.

## 0. Pré-requisitos
- **Node.js 20.9 ou superior** (`node -v`). Baixe em nodejs.org (versão LTS).
- **Git** e um editor (VS Code).
- Contas gratuitas: **Neon**, **Stripe**, **Mercado Pago**.

## 1. Instalar as dependências
```bash
cd aprovasync
npm install
cp .env.example .env.local      # Windows (PowerShell): Copy-Item .env.example .env.local
```
Todas as chaves abaixo vão dentro do arquivo `.env.local`. **Nunca** suba esse arquivo para o Git (já está no `.gitignore`).

## 2. `AUTH_SECRET` (assinatura do login)
```bash
openssl rand -base64 32
# sem openssl (Windows):
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Cole o resultado em `AUTH_SECRET=`. Use um valor **diferente** em produção.

## 3. Banco de dados — Neon (`DATABASE_URL`)
1. Acesse **console.neon.tech** → **New Project**. Região: **AWS South America (São Paulo)**.
2. No painel do projeto, clique em **Connect**. Marque **Pooled connection** e copie a *connection string* (`postgresql://...neon.tech/neondb?sslmode=require`).
3. Cole em `DATABASE_URL=`.
4. Crie as tabelas (a migration já está em `/drizzle`):
```bash
npm run db:migrate
```
Ver os dados: `npm run db:studio`.

## 4. Cartão e assinatura — Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
Para cobrar em reais é preciso uma conta Stripe do Brasil (CPF ou CNPJ). Para testar, o **modo de teste** basta.

**4.1 Chave secreta**
1. **dashboard.stripe.com** → ative o **modo de teste** (alternador no topo).
2. **Developers** → **API keys** → copie a **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY=`.
   (A *Publishable key* não é necessária: usamos Stripe Checkout hospedado.)

**4.2 Webhook em desenvolvimento (Stripe CLI)**
1. Instale o **Stripe CLI** (`brew install stripe/stripe-cli/stripe`, ou baixe em docs.stripe.com/stripe-cli).
2. `stripe login`
3. Em um terminal separado, deixe rodando:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
4. Ele imprime `whsec_...` → `STRIPE_WEBHOOK_SECRET=`.

**4.3 Webhook em produção**
**Developers** → **Webhooks** → **Add endpoint**:
- URL: `https://SEU-DOMINIO/api/webhooks/stripe`
- Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Depois de criar, **Reveal** o *Signing secret* (`whsec_...`) → variável de produção.

**4.4 Portal do cliente** (botão "Gerenciar assinatura")
**Settings** → **Billing** → **Customer portal** → ative e salve a configuração.

**Cartão de teste:** `4242 4242 4242 4242`, qualquer data futura, qualquer CVC.

## 5. Pix — Mercado Pago (`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`)
Para receber Pix real, a conta precisa estar **verificada** e ter uma chave Pix cadastrada.

**5.1 Access Token**
1. **mercadopago.com.br/developers** → **Suas integrações** → **Criar aplicação** (tipo *Pagamentos online*).
2. Na aplicação: **Credenciais de produção** → copie o **Access Token** (`APP_USR-...`) → `MERCADOPAGO_ACCESS_TOKEN=`.
   (Existem também *Credenciais de teste* com prefixo `TEST-`.)

**5.2 Webhook**
1. Na aplicação → **Webhooks** → **Configurar notificações**.
2. URL de produção: `https://SEU-DOMINIO/api/webhooks/mercadopago`
3. Evento: **Pagamentos**. Salve.
4. Copie a **Assinatura secreta** → `MERCADOPAGO_WEBHOOK_SECRET=`.

**5.3 Testando em `localhost`**
O Mercado Pago só notifica URLs públicas com HTTPS. Mesmo sem webhook, a tela do Pix **consulta a API a cada 4 s** e libera o plano sozinha, então o fluxo funciona em desenvolvimento.
Para testar o webhook local, exponha a porta (`npx cloudflared tunnel --url http://localhost:3000` ou ngrok) e use a URL pública em `NEXT_PUBLIC_APP_URL`.

**5.4 Teste de ponta a ponta com Pix real**
Temporariamente, ponha `amountCents: 100` (R$ 1,00) em `src/core/billing/pricing.ts`, pague com o seu Pix, confirme que o plano liberou e estorne no painel do Mercado Pago. Depois volte o valor.

## 6. Rodar localmente
```bash
npm run dev          # http://localhost:3000
npm test             # 130 testes (algoritmo + cobrança)
npm run typecheck
npm run build
```

## 7. Publicar na Vercel
1. Suba o projeto para o GitHub e **Import** na Vercel (framework detectado: Next.js).
2. **Settings → Environment Variables**: cadastre todas as variáveis do `.env.example`, com `NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO` e as chaves **live** (`sk_live_...`, token de produção).
3. Rode a migration no banco de produção: `DATABASE_URL="..." npm run db:migrate`.
4. Crie os webhooks de produção (4.3 e 5.2) e atualize os segredos.
5. Faça um pagamento real de baixo valor para validar.

## 8. Itens de conformidade e segurança
Recuperação de senha (Resend), limite de tentativas (Upstash), monitoramento (Sentry), backup do Neon, Termos/Privacidade, CNPJ e nota fiscal: **veja `docs/CONFORMIDADE.md`** (passo a passo completo, com onde pegar cada chave).

> Se você já rodou `npm run db:migrate` com a versão anterior do projeto, o schema mudou (novas colunas e tabela de tokens). Em um banco de testes, o mais simples é apagar as tabelas e rodar `npm run db:migrate` de novo, ou usar `npm run db:push`.
