# Atualização rápida: limite de matérias por dia

Mesma lógica do `ATUALIZAR.md`: um campo novo no banco, que só se adiciona, nunca se recria.

## 1. Trocar os arquivos
Copie o novo `aprovasync.zip` por cima do projeto (preservando seu `.env.local`), como da última vez.

## 2. Banco de dados
Rode no **Neon → SQL Editor**, nas duas branches (dev e produção):
```sql
ALTER TABLE "study_plans" ADD COLUMN "max_subjects_per_day" smallint;
```

## 3. Instalar, testar, publicar
```bash
npm install
npm test          # 217 testes devem passar
npm run build
git add .
git commit -m "Limite de matérias por dia"
git push
```

## O que mudou
- No formulário "Novo plano", logo abaixo da lista de matérias, tem um campo **"Quantas matérias estudar por dia, no máximo?"**, com padrão de 3.
- Sem esse limite (opção "Sem limite"), o comportamento é exatamente o de antes — intercala todas as matérias que couberem no dia.
- Planos já criados **não mudam retroativamente** — o limite só vale para planos novos, criados depois desta atualização.
