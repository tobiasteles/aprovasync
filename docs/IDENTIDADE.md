# Identidade visual — AprovaSync

**Essência:** foco, clareza e alívio da ansiedade. O produto existe para tirar o peso de "estou atrasado".

## Logo
Quadrado arredondado em **Azul Royal** com um **check branco** (tarefa cumprida) envolto por um **anel dourado aberto** (ciclo de reajuste = "sync"; o anel não fecha porque o plano nunca está "quebrado", só se reorganiza).
Arquivos: `src/components/brand/Logo.tsx` (React) e `src/app/icon.svg` (favicon).
Wordmark: **Aprova** em tinta (`ink`) + **Sync** em azul royal, peso 800.

## Paleta (tokens em `src/app/globals.css`)
| Papel | Token | Hex | Uso |
|---|---|---|---|
| Foco / ação | `royal-600` | `#2347C9` | Botões primários, links, logo |
| Hover/pressed | `royal-700` / `800` | `#1B39A6` / `#172F82` | Estados |
| Conquista | `gold-500` | `#F4B400` | Progresso, CTA de compra, celebração |
| Texto sobre dourado claro | `gold-700` | `#8A5F00` | Badges (contraste AA) |
| Fundo | `paper` | `#FAF8F3` | Off-white quente, descansa a vista |
| Superfície alternativa | `paper-2` | `#F3EFE5` | Trilhas, blocos suaves |
| Texto | `ink` / `ink-soft` | `#12203F` / `#4A5776` | Títulos / apoio |
| Linhas | `line` | `#E6E1D3` | Bordas |
| Sucesso | `ok` | `#0A7D56` | Concluído |
| Atenção | `warn` | `#C2410C` | Atraso (laranja, nunca vermelho) |

**Regra de ouro:** azul conduz, dourado celebra, o resto é calma. Dourado nunca é cor de texto sobre fundo branco.

## Tipografia
Pilha de sistema com Inter como preferência (`--font-sans`). Títulos em 800 com `tracking-tight`; corpo em 400/500.
Para self-hostear Inter, use `next/font/google` ou `next/font/local` em `src/app/layout.tsx`.

## Forma e movimento
Cantos generosos (`rounded-xl/3xl`), sombras muito suaves, transições curtas. Sem animações que pressionem (nada de contagem regressiva piscando).

## Voz e tom
Acolhedor, direto, sem culpa. O atraso é um fato a reorganizar, não uma falha.

| Evite | Prefira |
|---|---|
| "Você está atrasado!" | "Você tem 3h para reorganizar. A gente cuida." |
| "Meta não cumprida" | "Tudo bem. Um passo de cada vez." |
| "Erro" | "Não deu certo agora. Tente de novo em instantes." |
| "Prazo estourado" | "Não cabe tudo com as horas atuais. Quer ajustar?" |

## Acessibilidade
Contraste AA nos pares principais, foco visível (anel dourado), alvos de toque ≥ 44px nos botões, `aria-label` nos controles só-ícone, `role="alert"` em erros.
