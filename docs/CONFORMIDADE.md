# Conformidade, e-mail, segurança e operação — passo a passo

> **Aviso:** não sou advogado nem contador. Os textos legais são um ponto de partida sólido, mas **peça revisão a um advogado** (principalmente Termos e Privacidade) e a um **contador** (CNPJ e impostos). Dados de 13/10/2026; leis e prazos mudam.

---
## 1. Termos de Uso e Política de Privacidade (✅ feitos no código)
**Já está pronto:** páginas `/termos` e `/privacidade`, links no rodapé e no cadastro, caixa de aceite obrigatória (gravamos data e versão do aceite), política de reembolso de 7 dias, e as ferramentas de LGPD: **Minha conta → baixar meus dados / excluir conta**.

**O que falta você fazer:**
1. Preencher no `.env.local` (e na Vercel): `NEXT_PUBLIC_COMPANY_NAME`, `_COMPANY_CNPJ`, `_COMPANY_ADDRESS`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_FORUM_CITY`. Em desenvolvimento, as páginas mostram um aviso laranja enquanto houver campo vazio. **Variáveis `NEXT_PUBLIC_*` entram no build: mudou algum dado, faça um novo deploy.**
2. Criar o e-mail de contato (ex.: `privacidade@seudominio.com.br`) e **responder pedidos em até 15 dias**.
3. Levar os dois textos a um advogado. Pontos a conferir: idade mínima/menores, prazos de guarda fiscal, lista de operadores, política de reembolso.
4. Informar as URLs (`https://SEU-DOMINIO/termos` e `/privacidade`) nas configurações da sua conta **Stripe** e **Mercado Pago**.
5. Mudou algo nos textos? Aumente `LEGAL.version` em `src/lib/legal.ts`: novos cadastros gravam a versão nova.

**Mantenha atualizados** se trocar de fornecedor (ex.: sair do Resend): a lista de operadores na Política precisa refletir a realidade.

**Extras LGPD (simples, mas recomendados):** uma planilha com o "registro das operações de tratamento" (art. 37: quais dados, finalidade, base legal, com quem compartilha, por quanto tempo; o conteúdo da Política já serve de base) e um mini-plano de incidentes (quem avisa quem, em quanto tempo; art. 48). Empresas pequenas têm regime simplificado da ANPD (Resolução CD/ANPD nº 2/2022), mas **o canal do titular continua obrigatório**.

---
## 2. CNPJ e nota fiscal (você precisa fazer; eu explico o caminho)

### 2.1 MEI não serve para este negócio (provavelmente)
- Limite do MEI em 2026: **R$ 81.000/ano** (R$ 6.750/mês em média).
- **Desenvolvimento/licenciamento de software não está entre as atividades permitidas ao MEI.** Mesmo faturando pouco, a atividade-fim do AprovaSync (software por assinatura) tende a exigir outro enquadramento.
- Caminho usual: abrir uma **empresa no Simples Nacional** como **ME (microempresa, até R$ 360 mil/ano)**. Tipo jurídico: **SLU** (Sociedade Limitada Unipessoal, separa seu patrimônio pessoal do da empresa) ou **Empresário Individual**. Peça ao contador para comparar.
- ⚠️ Confirme tudo com um contador antes de abrir. Se algum site de "MEI de TI" prometer o contrário, desconfie.

### 2.2 Passo a passo para abrir
1. **Contrate um contador** (peça 2–3 orçamentos; muitos abrem a empresa e fazem a contabilidade mensal do Simples).
2. Defina **nome, endereço** (pode ser residencial, se a prefeitura permitir) e **capital social**.
3. Escolha os **CNAEs** com o contador. Para SaaS costumam ser usados *6311-9/00 (tratamento de dados, hospedagem e serviços de aplicação na internet)* e *6203-1/00 (desenvolvimento e licenciamento de programas de computador não customizáveis)*. **Confirme** com o contador.
4. Registro na Junta Comercial pelo portal **Redesim/Gov.br**; depois **inscrição municipal** (e alvará, se a prefeitura exigir).
5. **Opte pelo Simples Nacional** (há prazo curto após a abertura; o contador cuida). O anexo (III ou V) costuma depender do *Fator R*; o contador calcula.
6. Abra **conta bancária PJ** e **vincule o CNPJ** nas contas Stripe e Mercado Pago (substitui o CPF; muda onde o dinheiro cai).
7. Providencie **certificado digital** e-CNPJ se o contador pedir.

### 2.3 Nota fiscal (NFS-e)
- Software por assinatura é, em regra, **serviço** (ISS) → **NFS-e**.
- **Novidade:** a emissão pelo **Emissor Nacional da NFS-e** passa a ser **obrigatória para ME/EPP do Simples a partir de 1º de novembro de 2026** (Resolução CGSN nº 191/2026, que ajustou a data anterior). Em 2027 entram regras de CBS/IBS.
- **Como emitir:** 
  - *Começo (poucas vendas):* manualmente no **Emissor Nacional (web)**, com login gov.br. Um dia por semana, emita as notas das vendas recebidas. O contador define o **momento** de emitir e como tratar o cliente pessoa física.
  - *Depois (escala):* automatizar pela **API do Emissor Nacional** ou por um serviço como eNotas, Focus NFe, PlugNotas ou NFE.io. O gancho no código é `syncMercadoPagoPayment` / `recordStripePassPayment` (`src/server/services/billing.service.ts`): é onde um pagamento vira "aprovado" e onde você chamaria o emissor.
- Guarde os extratos do Stripe e do Mercado Pago: o contador usa para conciliar receita.
- **Atenção:** o reembolso de 7 dias gera **cancelamento/estorno** contábil; avise o contador.

---
## 3. Recuperação de senha por e-mail (✅ feita no código; falta ligar o e-mail)
Fluxo pronto: **Esqueci minha senha → e-mail com link (60 min, uso único) → nova senha → outros dispositivos são desconectados**. Nunca revelamos se o e-mail existe; só o *hash* do token fica no banco.

**Ligar o envio (Resend):**
1. Crie conta em **resend.com**.
2. **Domains → Add Domain** (ex.: `seudominio.com.br`) e adicione no seu provedor de DNS os registros que ele mostrar (SPF/DKIM). Aguarde "Verified".
3. **API Keys → Create API Key** → `RESEND_API_KEY=`.
4. `EMAIL_FROM="AprovaSync <nao-responda@seudominio.com.br>"` (precisa ser do domínio verificado).
5. Teste: peça a recuperação de senha com seu e-mail. **Sem `RESEND_API_KEY`, em desenvolvimento o link aparece no terminal do `npm run dev`.**
> Os limites do plano gratuito mudam: confira no painel do Resend.

---
## 4. Limite de tentativas (✅ feito no código; falta ligar o Upstash)
Regras ativas (ajuste em `src/lib/ratelimit.ts`): login 5 tentativas/15 min por e-mail e 30 por IP; cadastro 5/h por IP; recuperação 3/h por e-mail e 10/h por IP; criação de cobranças 10/h por usuário.
Sem Upstash, usa **memória local** (ok para desenvolvimento, **pouco eficaz na Vercel**, pois cada execução tem a sua).

**Ligar o Upstash:**
1. **console.upstash.com → Create Database** (Redis; escolha a região mais próxima, ex. São Paulo se disponível).
2. Aba **REST API** → copie **URL** e **Token** → `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
3. Se o Upstash cair, o sistema **libera** (falha aberta) para não trancar todos os usuários; o erro vai para o log/Sentry.

---
## 5. Backup e branches do Neon
**Dois níveis de proteção:**
1. **Restauração ponto-no-tempo** (built-in): no painel do Neon, em **Backup & Restore** (ou *Restore*), você volta o banco a um instante anterior. **A janela de retenção depende do seu plano**: confira em *Settings* e, antes de ter clientes pagantes, considere um plano com janela maior.
2. **Cópia lógica semanal** (já incluída): `.github/workflows/backup.yml`.
   - No GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
     - `DATABASE_URL_DIRECT` = string de conexão **direta** do Neon (em **Connect**, desmarque *Pooled connection*).
     - `BACKUP_PASSPHRASE` = senha longa (guarde-a em um gerenciador de senhas; sem ela o backup não abre).
   - Ajuste `PG_VERSION` para a versão major do seu projeto Neon (Settings → General).
   - **Repositório PRIVADO** sempre. Rode uma vez em **Actions → Backup do banco → Run workflow** e confira o artefato.
   - Para restaurar: `openssl enc -d -aes-256-cbc -pbkdf2 -pass pass:SUA_SENHA -in backup-AAAA-MM-DD.sql.gz.enc | gunzip | psql "$URL_DO_BANCO_NOVO"`.
   - **Faça um teste de restauração por trimestre** em uma branch descartável; backup que nunca foi restaurado não é backup.
3. **Branches (ambiente de testes):** no Neon, **Branches → Create branch** a partir da principal (cópia instantânea e barata). Use a string da branch `dev` no `.env.local`, e **nunca** a de produção. Para testar uma migration arriscada, crie uma branch, aplique lá e só então aplique em produção. (Há integração Neon↔Vercel para criar uma branch por *preview deploy*.)
> Os backups têm dados pessoais: mantenha-os criptografados (como o workflow faz) e cumpra a retenção descrita na Política de Privacidade.

---
## 6. Monitoramento (Sentry)
Código pronto (`instrumentation.ts`, `instrumentation-client.ts`, `global-error.tsx`) com **remoção de dados pessoais** antes do envio (usuário, IP, cookies, cabeçalhos e corpo da requisição).
1. **sentry.io → Create Project → Next.js** → copie o **DSN**.
2. `SENTRY_DSN=` (servidor) e `NEXT_PUBLIC_SENTRY_DSN=` (navegador): pode ser o mesmo valor.
3. **Alerts → Create Alert** → e-mail quando surgir um problema novo.
4. Opcional: *source maps* legíveis: `npx @sentry/wizard@latest -i sourcemaps` (pede token de autenticação do Sentry).
5. Também monitore **uptime** (UptimeRobot ou Better Stack, gratuitos) apontando para a landing e `/entrar`, e ative os **alertas de falha de webhook** no Stripe (Developers → Webhooks) e no Mercado Pago.

---
## 7. Checklist final antes de abrir
- [ ] Termos/Privacidade revisados por advogado e dados da empresa preenchidos
- [ ] CNPJ (ME/Simples) aberto, contador contratado, conta PJ vinculada ao Stripe/Mercado Pago
- [ ] Rotina de emissão de NFS-e definida (Emissor Nacional)
- [ ] Resend, Upstash e Sentry configurados; teste de "Esqueci minha senha" em produção
- [ ] Backup semanal rodou e **restauração testada**
- [ ] Pagamento real de baixo valor (Pix e cartão) + reembolso testados
