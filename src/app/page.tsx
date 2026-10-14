import Link from 'next/link';
import { PRICING, formatBRL } from '@/core/billing';
import { Logo } from '@/components/brand/Logo';
import { getCurrentUser } from '@/lib/auth';
import { isBeta } from '@/lib/config';

const STEPS = [
  { n: '1', title: 'Conte sobre a sua prova', text: 'Data, matérias, pesos e quantas horas você realmente tem em cada dia da semana.' },
  { n: '2', title: 'Receba um plano realista', text: 'Distribuímos as matérias pelo peso, intercaladas, e guardamos 15% de folga para a vida real.' },
  { n: '3', title: 'Perdeu um dia? Um toque.', text: 'O botão Imprevisto reorganiza o atraso nos próximos dias sem passar do seu limite diário.' },
];

const FAQ_BETA = [
  { q: 'O beta é gratuito mesmo?', a: 'Sim. Durante o beta você usa tudo de graça e sem cartão. Se um dia passarmos a cobrar, avisamos por e-mail com pelo menos 30 dias de antecedência, e nada é cobrado sem você contratar.' },
  { q: 'E se o atraso não couber até a prova?', a: 'Nós avisamos quantas horas faltam e você decide: aumentar as horas por dia ou ajustar o plano. Nunca escondemos o problema nem estouramos seu limite.' },
  { q: 'Posso apagar meus dados?', a: 'Pode. Em Minha conta você baixa uma cópia e exclui tudo quando quiser.' },
  { q: 'Serve para ENEM e vestibulares?', a: 'Serve. Qualquer prova com data marcada e matérias com pesos diferentes.' },
];

const FAQ_PAID = [
  { q: 'E se o atraso não couber até a prova?', a: 'Nós avisamos quantas horas faltam e você decide: aumentar as horas por dia ou ajustar o plano. Nunca escondemos o problema nem estouramos seu limite.' },
  { q: 'Preciso de cartão para testar?', a: `Não. São ${PRICING.trialDays} dias com tudo liberado, sem cadastrar cartão.` },
  { q: 'Posso pagar com Pix?', a: 'Sim. O Passe do Edital aceita Pix ou cartão. A assinatura mensal é no cartão, para renovar sozinha.' },
  { q: 'Serve para ENEM e vestibulares?', a: 'Serve. Qualquer prova com data marcada e matérias com pesos diferentes.' },
];

export default async function Landing() {
  const user = await getCurrentUser().catch(() => null);
  const beta = isBeta();
  const FAQ = beta ? FAQ_BETA : FAQ_PAID;

  return (
    <div>
      <header className="page flex items-center justify-between py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/app" className="btn btn-primary">Meus planos</Link>
          ) : (
            <>
              <Link href="/entrar" className="btn btn-ghost hidden sm:inline-flex">Entrar</Link>
              <Link href="/cadastro" className="btn btn-primary">{beta ? 'Criar conta grátis' : 'Testar grátis'}</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="page grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div>
            <span className="badge bg-gold-100 text-gold-700">Para concurseiros e estudantes do ENEM</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Perdeu um dia de estudo? <span className="text-royal-600">A gente refaz o plano.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-soft">
              Um cronograma que respira com você. Sem culpa, sem planilha quebrada: o AprovaSync redistribui a matéria atrasada até a data da prova.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cadastro" className="btn btn-primary px-7 py-3.5 text-base">{beta ? 'Entrar no beta gratuito' : `Começar ${PRICING.trialDays} dias grátis`}</Link>
              <a href="#como-funciona" className="btn btn-ghost px-7 py-3.5 text-base">Como funciona</a>
            </div>
          </div>

          {/* Prévia ilustrativa do produto */}
          <div className="card relative mx-auto w-full max-w-sm space-y-3 rotate-1" aria-hidden>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Hoje</p>
                <p className="text-lg font-bold">3h de estudo</p>
              </div>
              <span className="badge bg-gold-100 text-gold-700">64% do edital</span>
            </div>
            {[
              ['Língua Portuguesa', '1h30', '#2347C9', true],
              ['Direito Constitucional', '1h', '#F4B400', false],
              ['Raciocínio Lógico', '30min', '#0E9F8E', false],
            ].map(([n, t, c, d]) => (
              <div key={String(n)} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
                <span className={`grid h-6 w-6 place-items-center rounded-full border-2 text-xs ${d ? 'border-ok bg-ok text-white' : 'border-royal-300'}`}>{d ? '✓' : ''}</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: String(c) }} />
                <span className="flex-1 text-sm font-medium">{n}</span>
                <span className="text-sm text-ink-soft">{t}</span>
              </div>
            ))}
            <div className="rounded-2xl bg-royal-50 px-4 py-3 text-sm text-royal-800">
              <strong>Tudo bem.</strong> Reorganizamos 2h para quinta e sexta. Um passo de cada vez.
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="bg-paper-2/60 py-16">
          <div className="page">
            <h2 className="text-3xl font-extrabold tracking-tight">Planejar não deveria dar ansiedade</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="card">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-royal-600 text-lg font-bold text-white">{s.n}</span>
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PREÇOS / BETA */}
        {beta ? (
          <section id="precos" className="page py-16">
            <div className="card mx-auto max-w-2xl text-center">
              <span className="badge bg-gold-100 text-gold-700">Versão beta</span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight">Grátis enquanto a gente aprende com você</h2>
              <p className="mx-auto mt-3 max-w-md text-ink-soft">
                Use tudo, sem cartão. Seu feedback molda o produto. Se um dia cobrarmos, você será avisado com 30 dias de antecedência.
              </p>
              <Link href="/cadastro" className="btn btn-gold mt-6 px-7 py-3.5 text-base">Quero participar do beta</Link>
            </div>
          </section>
        ) : (
        <section id="precos" className="page py-16">
          <h2 className="text-3xl font-extrabold tracking-tight">Preço justo, sem pegadinha</h2>
          <p className="mt-2 text-ink-soft">Comece grátis por {PRICING.trialDays} dias. Imprevistos ilimitados em qualquer plano.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="card flex flex-col">
              <span className="badge self-start bg-gold-100 text-gold-700">Mais escolhido pra uma prova</span>
              <h3 className="mt-4 text-xl font-bold">{PRICING.pass.name}</h3>
              <p className="mt-3 text-4xl font-extrabold">{formatBRL(PRICING.pass.amountCents)}<span className="text-base font-medium text-ink-soft"> pagamento único</span></p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
                <li>✓ 1 plano completo até a prova (+{PRICING.passGraceDays} dias)</li>
                <li>✓ Pix ou cartão de crédito</li>
                <li>✓ Imprevisto ilimitado</li>
              </ul>
              <Link href="/cadastro" className="btn btn-gold mt-6">Quero o Passe</Link>
            </div>
            <div className="card flex flex-col border-royal-200">
              <span className="badge self-start bg-royal-100 text-royal-700">Para quem estuda para várias provas</span>
              <h3 className="mt-4 text-xl font-bold">{PRICING.subscription.name}</h3>
              <p className="mt-3 text-4xl font-extrabold">{formatBRL(PRICING.subscription.amountCents)}<span className="text-base font-medium text-ink-soft"> /mês</span></p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
                <li>✓ Planos ilimitados</li>
                <li>✓ Cancele quando quiser</li>
                <li>✓ Cartão de crédito, renovação automática</li>
              </ul>
              <Link href="/cadastro" className="btn btn-primary mt-6">Assinar</Link>
            </div>
          </div>
        </section>
        )}

        {/* FAQ */}
        <section className="page pb-20">
          <h2 className="text-3xl font-extrabold tracking-tight">Perguntas frequentes</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="card group !p-5">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">{f.q}</summary>
                <p className="mt-3 text-sm text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="page flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
          <Logo size={26} />
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link href="/termos" className="hover:text-royal-600">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-royal-600">Política de Privacidade</Link>
            <span>© {new Date().getFullYear()} AprovaSync</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
