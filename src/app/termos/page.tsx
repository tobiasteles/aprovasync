import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatBRL, PRICING } from '@/core/billing';
import { LegalShell } from '@/components/ui/LegalShell';
import { isBeta } from '@/lib/config';
import { LEGAL } from '@/lib/legal';

export const metadata = { title: 'Termos de Uso' };

interface Section {
  id?: string;
  title: string;
  body: ReactNode;
}

export default function TermsPage() {
  const beta = isBeta();

  const sections: (Section | false)[] = [
    {
      title: 'O que é o AprovaSync',
      body: (
        <p>
          Ferramenta que gera um cronograma de estudos a partir da data da prova, das matérias, dos pesos e das horas que você informa, e que
          recalcula esse cronograma quando você registra um imprevisto. O serviço é um <strong>apoio de organização</strong>: não oferece
          conteúdo didático, correção, orientação pedagógica individual nem qualquer garantia de aprovação em provas ou concursos.
        </p>
      ),
    },
    {
      title: 'Conta e idade mínima',
      body: (
        <ul>
          <li>Você deve fornecer dados verdadeiros e manter sua senha em sigilo. Você é responsável pelas atividades feitas na sua conta.</li>
          <li>Menores de 12 anos não podem criar conta. Entre 12 e 17 anos, o uso exige ciência e autorização de um responsável legal.</li>
          <li>Cada conta é pessoal e intransferível.</li>
        </ul>
      ),
    },
    beta
      ? {
          title: 'Versão beta gratuita',
          body: (
            <>
              <p>
                O AprovaSync está em <strong>versão beta</strong> e é oferecido <strong>gratuitamente</strong>. Funções podem mudar, e pode haver
                instabilidades. Você pode baixar uma cópia dos seus dados a qualquer momento em <strong>Minha conta</strong>.
              </p>
              <p>
                Se passarmos a cobrar, avisaremos por e-mail com pelo menos <strong>30 dias de antecedência</strong>. Nada será cobrado sem a sua
                contratação expressa, e você poderá excluir a conta e os dados quando quiser.
              </p>
            </>
          ),
        }
      : {
          title: 'Teste grátis, Passe do Edital e Assinatura',
          body: (
            <ul>
              <li><strong>Teste grátis:</strong> {PRICING.trialDays} dias com todas as funções liberadas, sem cadastro de cartão. Ao fim, o cronograma continua visível, mas marcar estudos e usar o “Imprevisto” exige um plano pago.</li>
              <li><strong>{PRICING.pass.name}:</strong> {formatBRL(PRICING.pass.amountCents)}, pagamento único por Pix ou cartão. Libera <strong>um plano</strong> até a data da prova cadastrada mais {PRICING.passGraceDays} dias (mínimo de {PRICING.passMinDays} dias a partir da compra). Não renova automaticamente.</li>
              <li><strong>{PRICING.subscription.name}:</strong> {formatBRL(PRICING.subscription.amountCents)} por mês, no cartão de crédito, com renovação automática, para planos ilimitados. Você pode cancelar a qualquer momento pelo portal de assinatura; o acesso segue até o fim do período já pago.</li>
              <li>Os valores podem mudar. Mudanças não afetam períodos já pagos e, na assinatura, valem a partir da renovação seguinte, com aviso prévio.</li>
            </ul>
          ),
        },
    !beta && {
      title: 'Pagamentos',
      body: (
        <p>
          Os pagamentos são processados por terceiros: <strong>Mercado Pago</strong> (Pix) e <strong>Stripe</strong> (cartão). Não recebemos nem
          armazenamos o número completo do seu cartão. O acesso é liberado após a confirmação do pagamento pelo processador, o que normalmente leva segundos.
          Se a cobrança recorrente falhar, podemos suspender o acesso após um curto período de tolerância.
        </p>
      ),
    },
    !beta && {
      id: 'reembolso',
      title: 'Arrependimento e reembolso',
      body: (
        <p>
          Como a contratação é feita pela internet, você pode desistir em até <strong>7 dias corridos</strong> da compra (art. 49 do Código de Defesa do
          Consumidor) e receber o valor integral de volta, <strong>mesmo que já tenha usado o serviço</strong>. Para isso, escreva para{' '}
          <strong>{LEGAL.contactEmail}</strong> informando o e-mail da conta. O estorno é feito pelo mesmo meio de pagamento, no prazo do processador.
          Fora desse prazo, não há reembolso proporcional de períodos já utilizados, salvo falha do serviço ou obrigação legal.
        </p>
      ),
    },
    {
      title: 'Uso aceitável',
      body: <p>É proibido: tentar acessar contas de outras pessoas; sobrecarregar ou testar a segurança do serviço sem autorização; usar robôs para criar contas; copiar, revender ou redistribuir o serviço; usá-lo para fins ilícitos.</p>,
    },
    {
      title: 'Propriedade intelectual',
      body: <p>O software, a marca AprovaSync, o design e os textos são nossos ou licenciados a nós. Os dados que você insere (matérias, datas, anotações de progresso) continuam sendo seus; você nos autoriza a tratá-los apenas para prestar o serviço.</p>,
    },
    {
      title: 'Disponibilidade e responsabilidade',
      body: (
        <p>
          Trabalhamos para manter o serviço disponível, mas podem ocorrer interrupções por manutenção ou por falhas de terceiros (hospedagem{!beta && ', pagamento'}).
          O resultado do cronograma depende das informações fornecidas por você e do seu cumprimento. Nos limites da lei, não respondemos por
          resultados em provas, nem por prejuízos indiretos. Nada nestes Termos exclui direitos que a lei do consumidor garante a você.
        </p>
      ),
    },
    {
      title: 'Encerramento',
      body: (
        <p>
          Você pode excluir a conta a qualquer momento em <strong>Minha conta</strong>. Podemos suspender ou encerrar contas que violem estes Termos,
          com aviso sempre que possível.{!beta && ' A exclusão não gera reembolso fora das hipóteses da seção de arrependimento e reembolso.'}
        </p>
      ),
    },
    {
      title: 'Alterações destes Termos',
      body: <p>Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas por e-mail ou aviso no serviço. Continuar usando após a vigência significa concordar com a nova versão.</p>,
    },
    {
      title: 'Lei aplicável, foro e contato',
      body: (
        <p>
          Aplica-se a legislação brasileira. Fica eleito o foro do seu domicílio como consumidor; para demais casos, o foro de {LEGAL.forumCity}.
          Dúvidas, solicitações e reclamações: <strong>{LEGAL.contactEmail}</strong>.
        </p>
      ),
    },
  ];

  const visible = sections.filter((s): s is Section => Boolean(s));

  return (
    <LegalShell title="Termos de Uso">
      <p>
        Estes Termos regem o uso do <strong>AprovaSync</strong>, serviço on-line de organização de estudos oferecido por{' '}
        <strong>{LEGAL.companyName}</strong>, {LEGAL.taxIdLabel} {LEGAL.taxId}, com endereço em {LEGAL.address} (“<strong>nós</strong>”). Ao criar uma conta,
        você declara que leu e concorda com estes Termos e com a <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
      {visible.map((s, i) => (
        <section key={s.title}>
          <h2 id={s.id}>{i + 1}. {s.title}</h2>
          {s.body}
        </section>
      ))}
    </LegalShell>
  );
}
