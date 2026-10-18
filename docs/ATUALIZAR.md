# Como aplicar esta rodada de mudanças no site que já está no ar

Você já tem o AprovaSync publicado e testado (Mercado Pago funcionando, Stripe aguardando verificação). Este guia
é para **atualizar** esse site com tudo que mudou agora: identidade visual v2, teste de 14 dias, o convite no
momento do Imprevisto, ritmo e mapa de constância, revisão espaçada e o leitor de PDF do edital (travado para assinantes).

Ordem: local primeiro, depois produção. Não pule a Parte 3 (banco) nem rode `npm run db:migrate` direto em produção —
leia o aviso nela antes.

---
## Parte 1 — Trocar os arquivos do projeto

1. Feche o VS Code se estiver com o projeto aberto.
2. Descompacte o novo `aprovasync.zip` em uma pasta separada (ex.: `aprovasync-novo`).
3. **Antes de copiar por cima**, salve o que é só seu:
   - Copie o arquivo `.env.local` da pasta antiga para um lugar seguro (ele NÃO vem no zip; confirme que ainda existe na pasta antiga).
4. Copie todo o conteúdo de `aprovasync-novo/` para dentro da sua pasta `aprovasync/` do projeto, substituindo os arquivos existentes. Se você usa Git (Parte 4.1 do guia original), é mais simples: copie tudo por cima e deixe o Git mostrar o que mudou.
5. Coloque o `.env.local` de volta na pasta.

## Parte 2 — Instalar as dependências novas

```bash
cd aprovasync
npm install
```
Isso baixa o que entrou de novo: leitura de PDF (`pdf-parse`), validação (`zod`), a fonte Inter própria do site (`@fontsource/inter`) e algumas ferramentas que só eu usei para gerar o favicon (`sharp`, `to-ico`) — pode deixar, não atrapalham, só deixam a instalação um pouco maior.

## Parte 3 — Atualizar o banco de dados (⚠️ leia antes de rodar)

O schema ganhou 4 campos novos. Como seu banco **já tem dados**, rodar `npm run db:migrate` normalmente daria erro
(ele tentaria recriar tabelas que já existem). Em vez disso, rode este SQL manualmente — ele só **adiciona** colunas,
nunca apaga nada:

**Passo 1 — rode sozinha esta linha primeiro:**
```sql
ALTER TYPE "session_origin" ADD VALUE 'review';
```

**Passo 2 — depois que a de cima rodar, execute estas quatro juntas:**
```sql
ALTER TABLE "study_sessions" ADD COLUMN "review_offset_days" smallint;
ALTER TABLE "study_sessions" ADD COLUMN "reviews_generated" boolean NOT NULL DEFAULT false;
ALTER TABLE "study_plans" ADD COLUMN "edital_meta" jsonb;
ALTER TABLE "subjects" ADD COLUMN "topics" text[];
```

**Onde rodar:** no painel do Neon, abra o projeto → **SQL Editor** (menu lateral) → cole e execute. Repita isso **duas vezes**:
uma vez na branch que você usa em desenvolvimento (`dev`), outra vez na branch de **produção** (`main`) — veja a Parte 7.

> Projeto novo, banco ainda vazio? Aí sim use o caminho normal: `npm run db:migrate` (ele cria tudo do zero, já com os campos novos inclusos).

## Parte 4 — Nova variável de ambiente: leitura de PDF

Só é preciso se você quiser a função de ler o edital em PDF (o resto do site funciona sem ela).

1. **console.anthropic.com** → crie a conta, se ainda não tiver → **Settings → Billing** → cadastre um cartão e compre um valor inicial de créditos.
2. Nessa mesma tela de Billing, configure um **limite mensal de gasto** (proteção contra surpresa na fatura).
3. **Settings → API Keys → Create Key** → copie o valor (`sk-ant-...`).
4. No `.env.local`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Lembrete: essa função é **exclusiva para assinantes** (o teste grátis não libera, para não gastar sem necessidade) — isso já vem pronto no código, não precisa configurar nada a mais.

## Parte 5 — Testar no seu computador

```bash
npm run dev
```
Roteiro rápido:
1. Abra `http://localhost:3000` e confira a logo e as cores novas.
2. Entre com sua conta de teste → **Novo plano**. Se essa conta não for assinante, deve aparecer o convite "Assinar para liberar" no lugar do botão de PDF (é o esperado). Para testar o upload de verdade, use uma conta assinante ou ative `NEXT_PUBLIC_BETA_MODE=true` temporariamente.
3. Dentro de um plano, marque uma sessão como concluída e confira se aparecem sessões novas com o selo "revisão 24h/7d/30d" (pode levar um instante para a página atualizar).
4. Veja o mapa de constância e a frase de ritmo na página do plano.
5. Use o botão "Tive um imprevisto" numa conta em teste grátis e confira o convite que aparece logo abaixo do aviso de sucesso.
6. Rode os testes automatizados e o build:
   ```bash
   npm test         # 200 testes devem passar
   npm run build
   ```

## Parte 6 — Publicar

```bash
git add .
git commit -m "Identidade v2, revisão espaçada, leitor de edital em PDF"
git push
```
A Vercel publica sozinha a partir do push. Acompanhe em **Vercel → seu projeto → Deployments** até aparecer "Ready".

## Parte 7 — Atualizar o banco de PRODUÇÃO e as variáveis na Vercel

1. No Neon, troque para a branch de **produção** (a mesma que você usa como `DATABASE_URL` na Vercel) e rode lá o mesmo SQL da Parte 3 (as mesmas 2 etapas).
2. Na Vercel: **Settings → Environment Variables** → adicione `ANTHROPIC_API_KEY` (se for usar o leitor de PDF) → **Redeploy** para o valor passar a valer.

## Parte 8 — Conferir em produção

- [ ] Favicon novo aparece na aba do navegador e ao salvar o site na tela de início do celular.
- [ ] `/app/planos/novo`: sem ser assinante, aparece o convite no lugar do botão de PDF.
- [ ] Com uma conta assinante de verdade (ou cartão de teste do Stripe, se ainda estiver nesse modo), envie um edital real em PDF e confira se os dados vieram corretos.
- [ ] Marque uma sessão como concluída e confirme que as revisões aparecem.
- [ ] Um usuário novo tem 14 dias de teste (não mais 7).

## Para quem usa o modo beta
Se `NEXT_PUBLIC_BETA_MODE=true` estiver ativo, o leitor de PDF fica liberado para todo mundo (o modo beta já assume que você está bancando o custo de tudo de propósito). Se quiser manter o PDF travado mesmo em beta, me avise — é um ajuste pequeno.

## Se algo der errado
| Sintoma | Causa provável |
|---|---|
| Erro "type already exists" ou "column already exists" ao rodar o SQL | Você já rodou essa parte antes nesta branch — pode ignorar com segurança |
| Revisões não aparecem depois de concluir uma sessão | Confira se o SQL da Parte 3 rodou nessa branch do banco (colunas `review_offset_days`/`reviews_generated` precisam existir) |
| "Enviar PDF do edital" dá erro | Falta `ANTHROPIC_API_KEY`, ou a conta usada não é assinante |
| Build falha mencionando `@fontsource/inter` ou fonte não encontrada | Rode `npm install` de novo — os arquivos de fonte em `public/fonts` precisam estar na pasta (vêm no zip) |
