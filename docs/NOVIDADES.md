# Novidades desta rodada

## 1. Identidade visual v2
- **Paleta atualizada:** azul royal mais vibrante (`#1E3FC4`) e dourado mais rico (`#F2B705`); tokens em `src/app/globals.css`.
- **Logo refeita:** o mesmo conceito (check + anel aberto), com formas mais limpas em `src/components/brand/Logo.tsx`.
- **Fonte própria:** Inter autohospedada (`public/fonts/`), sem chamada a CDN de terceiros.
- **Favicon completo:** `favicon.ico`, `apple-icon.png` (tela de início no iPhone) e `icon.svg` gerados a partir da mesma marca.
- **Manifesto PWA** (`src/app/manifest.ts`) e **imagem de compartilhamento** (`src/app/opengraph-image.tsx`, aparece quando alguém cola o link no WhatsApp/Twitter).

## 2. Teste grátis de 14 dias (era 7)
`PRICING.trialDays` em `src/core/billing/pricing.ts`. Tempo maior para o aluno realmente passar por um imprevisto antes de decidir.

## 3. Paywall no momento certo
Quando o Imprevisto resolve algo com sucesso e a pessoa ainda está no teste grátis, aparece um cartão com o tempo que acabou de ser salvo e um convite para garantir o acesso — no lugar de um aviso genérico e frio de "seu teste acabou". Fica em `src/app/app/planos/[planId]/page.tsx` (`ImprevistoUpsell`).

## 4. Ritmo (em vez de comparar com outras pessoas)
Um aviso tipo "você está 3 dias à frente do ritmo necessário" ou "2 dias atrás", comparando só com o que o próprio plano exige — nunca com outros concurseiros. Lógica pura e testada em `src/core/schedule/pace.ts`, exibida por `PaceBadge`.

## 5. Mapa de constância (em vez de sequência que quebra)
Visual tipo "gráfico de contribuições" dos últimos estudos. Faltar um dia não zera nada — é só uma célula vazia, coerente com a proposta do produto. Em `src/components/plan/ConsistencyMap.tsx`.

## 6. Revisão espaçada automática (24h / 7d / 30d)
Ao marcar uma sessão como concluída, o sistema agenda sozinho revisões mais curtas em 1, 7 e 30 dias, respeitando o limite diário do seu plano (a mesma garantia do Imprevisto: nunca estoura a carga horária). Aparecem na lista com um selo "revisão 24h/7d/30d".
- Motor: `src/core/schedule/reviews.ts` (puro, testado).
- Persistência: `src/server/services/review.service.ts`, chamado de `toggleSessionAction`.
- Uma sessão só gera revisões uma vez (mesmo que desmarque/marque de novo), e uma revisão nunca gera outra revisão.

## 7. Leitura de edital em PDF
Em "Novo plano", dá para enviar o PDF do edital: o texto é extraído e um modelo da Anthropic (Claude) estrutura cargo, órgão, banca, vagas, salário, datas, um resumo em linguagem simples e as matérias com peso estimado (pela quantidade de questões, quando o edital informa) e tópicos-chave. Tudo isso pré-preenche o formulário — a pessoa sempre revisa antes de gerar o cronograma.
- Núcleo (schemas, mapeamento para o formulário): `src/core/edital/`.
- Extração de texto do PDF: `src/server/edital/pdf-text.ts` (biblioteca `pdf-parse`).
- Chamada à API da Anthropic com saída estruturada (tool use): `src/server/edital/claude.ts`.
- Rota: `POST /api/edital/parse` (autenticada, com limite de 8 envios/hora por pessoa).
- **Precisa da variável `ANTHROPIC_API_KEY`** — veja `docs/PASSO-A-PASSO.md`, seção 3.5. Sem ela, o resto do site funciona normalmente; só esse botão fica indisponível.
- O resumo nunca copia frases do edital — o modelo é instruído a reescrever com as próprias palavras (e isso é reforçado no núcleo em `core/edital`, não só no texto do pedido).
- **Exclusivo para assinantes:** como cada leitura de PDF chama uma API paga por uso, essa função fica disponível só para quem já é assinante mensal (ou está no modo beta). Durante o teste grátis, o botão vira um convite para assinar; a verificação é feita de novo dentro da própria rota (`/api/edital/parse`), não só na tela, então não dá para contornar. Regra pura e testada em `src/core/billing/access.ts` (`canUseEditalUpload`).

## Testes
195 testes automatizados (eram 152), incluindo o motor de revisão espaçada e a extração/validação do edital. Também rodei a nova migração contra um Postgres real e o build de produção completo.

## Um bug real encontrado e corrigido nesta rodada
Ao testar o motor de revisão espaçada contra Postgres de verdade, apareceu um caso em que duas revisões da mesma sessão (ex.: a de 1 dia e a de 7 dias) podiam cair no mesmo dia e, juntas, ultrapassar o limite diário — porque o cálculo não "lembrava" que já tinha ocupado aquele horário ao posicionar a revisão seguinte. Foi corrigido em `src/core/schedule/reviews.ts` e agora há um teste específico para esse caso (`__tests__/schedule.test.ts`, "regressão: duas revisões da MESMA sessão nunca estouram o limite do dia juntas").
