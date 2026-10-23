<div align="center">

# 📅 AprovaSync

**Cronograma de estudos adaptativo para concursos e ENEM. Perdeu um dia de estudo? O botão "Imprevisto" redistribui a matéria atrasada até a data da prova, sem estourar o limite diário.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Stripe](https://img.shields.io/badge/Stripe-008CDD?logo=stripe&logoColor=white)](https://stripe.com)
[![Vitest](https://img.shields.io/badge/Vitest-tested-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)

[**🔗 Ver online**](https://SEU-LINK-AQUI) · [Reportar um bug](../../issues)

<!-- Adicione um print em docs/preview.png e descomente a linha abaixo:
<img src="docs/preview.png" alt="Tela do AprovaSync" width="720" />
-->

</div>

---

## ✨ O problema

Quem estuda para concurso sabe: um plano de estudos perfeito dura até o primeiro imprevisto. Planilhas não se ajustam sozinhas, e atrasar vira ansiedade. O AprovaSync gera o cronograma até a prova e, quando a vida atrapalha, **recalcula tudo em um clique**.

## 🚀 Funcionalidades

- **Cronograma automático** a partir das matérias, pesos, horas por dia e data da prova, com folga de 15% reservada para imprevistos
- **Botão Imprevisto:** redistribui o atraso até a prova respeitando o limite diário. A operação é atômica: se não couber, nada muda e o app mostra quantas horas faltam
- **Revisão espaçada automática** (24h, 7 dias e 30 dias) ao concluir uma sessão
- **Ritmo:** mostra se você está à frente ou atrás do que o plano exige, comparando só com o seu próprio plano
- **Mapa de constância**, no estilo do gráfico de contribuições do GitHub, onde faltar um dia não zera nada
- **Limite de matérias por dia**, para evitar cronogramas "colcha de retalhos"
- **Leitura de edital em PDF com IA:** extrai cargo, banca, matérias e pesos para pré-preencher o plano (a pessoa sempre revisa antes de gerar)
- **Cobrança:** Pix (Mercado Pago) para acesso avulso e cartão recorrente (Stripe), com teste grátis e **modo beta** opcional
- **LGPD:** termos e privacidade com aceite versionado, exportação e exclusão de dados da conta

## 🛠️ Stack

| Camada          | Tecnologias                                              |
| --------------- | -------------------------------------------------------- |
| Framework       | Next.js 16 (App Router) e React 19                       |
| Linguagem       | TypeScript                                               |
| Estilo          | Tailwind CSS 4 e Inter autohospedada                     |
| Banco de dados  | PostgreSQL no Neon com Drizzle ORM                       |
| Autenticação    | E-mail e senha (bcrypt) com sessão JWT em cookie `httpOnly` |
| Pagamentos      | Stripe (cartão) e Mercado Pago (Pix)                     |
| E-mail          | Resend                                                   |
| Segurança       | Rate limit com Upstash Redis                             |
| Monitoramento   | Sentry                                                   |
| Testes          | Vitest                                                   |
| IA              | API da Anthropic (leitura de editais)                    |

## 🧠 Decisões de arquitetura

- **Domínio puro e testado:** toda a lógica de agenda e de cobrança fica em `src/core`, sem React, banco ou `Date.now()`, o que a torna determinística e fácil de testar
- **Imprevisto honesto:** se o atraso não cabe até a prova, o app não finge que coube
- **Webhooks idempotentes:** o Mercado Pago é sempre reconsultado pela API, porque o corpo da notificação sozinho não é confiável
- **Acesso verificado no servidor:** funções pagas são checadas também nas rotas de API, não só na interface
- **Bugs de regressão viram teste:** casos encontrados durante o desenvolvimento ficaram cobertos por testes específicos

## 📁 Estrutura

```
src/
├── core/        # domínio puro: schedule (gerar, recalcular, revisões, ritmo), billing, edital
├── server/      # schema Drizzle, serviços, actions e integrações (Stripe, Mercado Pago)
├── app/         # landing, login/cadastro, /app (painel, plano, assinatura, Pix) e /api (webhooks)
├── components/  # brand, ui, plan, billing
└── lib/         # auth, env, datas no fuso de Brasília, formulários
```

## 🧪 Rodando localmente

```bash
git clone https://github.com/tobiasteles/aprovasync.git
cd aprovasync
npm install

cp .env.example .env.local   # preencha o essencial: DATABASE_URL e AUTH_SECRET

npm run db:push              # cria as tabelas
npm run dev                  # http://localhost:3000
npm test                     # roda a suíte de testes
```

Para testar sem cobrança, use `NEXT_PUBLIC_BETA_MODE=true`, que libera tudo e desliga Stripe e Mercado Pago.

As variáveis de pagamento, e-mail, Upstash e Sentry são opcionais em desenvolvimento. O passo a passo completo está em [`docs/PASSO-A-PASSO.md`](docs/PASSO-A-PASSO.md).

## 🗺️ Ainda não incluído

Verificação de e-mail no cadastro, login social, catálogo de editais prontos, emissão automática de NFS-e e painel administrativo.

## 👤 Autor

**Tobias Teles** · [Portfólio](https://tobiasteles.vercel.app) · [LinkedIn](https://www.linkedin.com/in/tobias-teles/)
