import Link from 'next/link';
import { LegalShell } from '@/components/ui/LegalShell';
import { isBeta } from '@/lib/config';
import { LEGAL } from '@/lib/legal';

export const metadata = { title: 'Política de Privacidade' };

export default function PrivacyPage() {
  const beta = isBeta();
  return (
    <LegalShell title="Política de Privacidade">
      <p>
        Esta Política explica como o <strong>AprovaSync</strong> trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        Resumo: coletamos só o necessário para montar seu cronograma e receber o pagamento, <strong>não vendemos seus dados</strong> e você pode
        baixar ou excluir tudo em <Link href="/app/conta">Minha conta</Link>.
      </p>

      <h2>1. Quem é o controlador</h2>
      <p>
        <strong>{LEGAL.companyName}</strong>, {LEGAL.taxIdLabel} {LEGAL.taxId}, {LEGAL.address}. Contato para assuntos de privacidade{LEGAL.dpoName ? ` (encarregado: ${LEGAL.dpoName})` : ''}:{' '}
        <strong>{LEGAL.contactEmail}</strong>.
      </p>

      <h2>2. Dados que coletamos</h2>
      <table>
        <thead><tr><th>Categoria</th><th>Dados</th><th>De onde vêm</th></tr></thead>
        <tbody>
          <tr><td>Conta</td><td>Nome, e-mail, senha (guardada apenas como hash irreversível), data e versão do aceite dos Termos</td><td>Você</td></tr>
          <tr><td>Plano de estudos</td><td>Nome do plano, data da prova, matérias, pesos, horas por dia, sessões e progresso, histórico de “imprevistos”</td><td>Você</td></tr>
          {!beta && <tr><td>Pagamento</td><td>Valor, status, forma (Pix/cartão) e identificadores da transação. <strong>Não temos o número do seu cartão.</strong></td><td>Mercado Pago e Stripe</td></tr>}
          <tr><td>Técnicos</td><td>Endereço IP, navegador, registros de erro e de segurança, cookie de sessão</td><td>Seu dispositivo</td></tr>
          <tr><td>Contato</td><td>Mensagens que você nos envia</td><td>Você</td></tr>
        </tbody>
      </table>
      <p>Não coletamos dados pessoais sensíveis (art. 5º, II da LGPD) e não fazemos decisões automatizadas que produzam efeitos jurídicos sobre você. O recálculo do cronograma é uma função do produto, e você controla seus resultados.</p>

      <h2>3. Para que usamos e em que base legal</h2>
      <table>
        <thead><tr><th>Finalidade</th><th>Base legal (art. 7º)</th></tr></thead>
        <tbody>
          <tr><td>Criar a conta, gerar e recalcular seu cronograma, mostrar progresso</td><td>Execução de contrato (V)</td></tr>
          {!beta && <tr><td>Cobrar, confirmar pagamentos, liberar acesso, enviar recibos</td><td>Execução de contrato (V)</td></tr>}
          <tr><td>Recuperação de senha e e-mails de serviço</td><td>Execução de contrato (V)</td></tr>
          {!beta && <tr><td>Guardar registros de pagamento por prazo fiscal</td><td>Cumprimento de obrigação legal (II)</td></tr>}
          <tr><td>Segurança, prevenção a fraude e abuso (limite de tentativas), diagnóstico de falhas</td><td>Legítimo interesse (IX)</td></tr>
          <tr><td>Responder solicitações e exercer direitos em processos</td><td>Obrigação legal e exercício regular de direitos (II e VI)</td></tr>
        </tbody>
      </table>
      <p>Não usamos seus dados para publicidade nem enviamos marketing sem o seu consentimento.</p>

      <h2>4. Cookies</h2>
      <p>Usamos apenas um cookie <strong>essencial</strong> de sessão (<code>aprovasync_session</code>), para manter você conectado. Ele é HttpOnly e dura até 30 dias. Não usamos cookies de publicidade ou de rastreamento de terceiros.</p>

      <h2>5. Com quem compartilhamos (operadores)</h2>
      <p>Usamos prestadores que tratam dados em nosso nome, sob contrato, apenas para as finalidades acima:</p>
      <ul>
        <li><strong>Neon</strong> — banco de dados.</li>
        <li><strong>Vercel</strong> — hospedagem da aplicação.</li>
        {!beta && <li><strong>Stripe</strong> — pagamentos com cartão e assinatura.</li>}
        {!beta && <li><strong>Mercado Pago</strong> — pagamentos via Pix.</li>}
        <li><strong>Resend</strong> — envio de e-mails de serviço (ex.: recuperação de senha).</li>
        <li><strong>Upstash</strong> — limite de tentativas de login (guarda seu IP por poucos minutos).</li>
        <li><strong>Sentry</strong> — monitoramento de erros (sem coletar dados pessoais por padrão).</li>
      </ul>
      <p>
        Também podemos compartilhar dados com autoridades quando a lei exigir. <strong>Transferência internacional:</strong> alguns prestadores
        processam dados fora do Brasil (art. 33 da LGPD); exigimos garantias contratuais de proteção compatíveis com a lei.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <ul>
        <li><strong>Conta e plano de estudos:</strong> enquanto a conta existir. Ao excluí-la, apagamos esses dados e anonimizamos a conta.</li>
        {!beta && <li><strong>Registros de pagamento:</strong> mantidos, sem identificar você diretamente, pelo prazo de guarda fiscal e contábil (em regra, até 5 anos).</li>}
        <li><strong>Tokens de recuperação de senha:</strong> expiram em 60 minutos; só guardamos o hash.</li>
        <li><strong>Registros técnicos e de erro:</strong> por prazo curto, só pelo tempo necessário para segurança e diagnóstico.</li>
      </ul>

      <h2>7. Seus direitos (art. 18)</h2>
      <p>Você pode, a qualquer momento: confirmar que tratamos seus dados; acessá-los; corrigi-los; pedir anonimização, bloqueio ou eliminação; solicitar portabilidade; saber com quem compartilhamos; revogar consentimento (quando for a base); e se opor a tratamento indevido.</p>
      <ul>
        <li><strong>Autoatendimento:</strong> em <Link href="/app/conta">Minha conta</Link> você baixa seus dados (JSON) e exclui a conta.</li>
        <li><strong>Outros pedidos:</strong> escreva para {LEGAL.contactEmail}. Respondemos em até 15 dias.</li>
        <li>Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</li>
      </ul>

      <h2>8. Segurança</h2>
      <p>Conexão criptografada (HTTPS), senhas protegidas com hash bcrypt, tokens de recuperação armazenados só como hash, sessões em cookie HttpOnly, limite de tentativas de login e acesso restrito aos dados. Nenhum sistema é 100% imune; se ocorrer incidente que possa causar risco relevante, comunicaremos você e a ANPD nos termos do art. 48.</p>

      <h2>9. Crianças e adolescentes</h2>
      <p>O serviço é voltado a estudantes e concurseiros. Menores de 12 anos não podem usar o AprovaSync. Entre 12 e 17 anos, o uso depende de autorização de um responsável, e tratamos os dados sempre no melhor interesse do adolescente, coletando apenas o indispensável.</p>

      <h2>10. Alterações</h2>
      <p>Podemos atualizar esta Política. A versão vigente fica sempre nesta página, com data e número de versão; mudanças relevantes serão avisadas por e-mail ou no serviço.</p>
    </LegalShell>
  );
}
