import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacidade — La Fortuna Academy' };

/**
 * Política de privacidade do app e da área de membros. As lojas (Apple e
 * Google) pedem um endereço público para ela; é este, sem login.
 *
 * ⚠️ Antes de publicar: conferir com a La Fortuna a razão social, o CNPJ e o
 * e-mail de contato abaixo.
 */
const EMPRESA = 'La Fortuna Academy';
const CONTATO = 'contato@lafortunaacademy.com.br';
const ATUALIZADA_EM = '30 de outubro de 2026';

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14 text-sm leading-relaxed text-texto-suave [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-texto [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="display text-3xl text-texto">Política de privacidade</h1>
      <p className="mt-2 text-xs">Atualizada em {ATUALIZADA_EM}</p>

      <p className="mt-8">
        Esta política vale para a área de membros da {EMPRESA}, no navegador e no app de celular. A área é de uso
        exclusivo das mentoradas e da equipe; ninguém se cadastra sozinha.
      </p>

      <h2>O que guardamos</h2>
      <ul>
        <li>Nome e e-mail, para você entrar (sem senha: o acesso é por código enviado ao e-mail).</li>
        <li>
          O que faz parte da sua mentoria: sessões, tarefas, respostas de formulários, arquivos que você envia e
          resultados que você registra.
        </li>
        <li>
          No app de celular, se você permitir notificações: um identificador do aparelho, usado só para mandar os
          avisos.
        </li>
      </ul>
      <p className="mt-3">Não usamos os seus dados para publicidade e não os vendemos nem compartilhamos com terceiros.</p>

      <h2>Para que usamos</h2>
      <ul>
        <li>Acompanhar a sua mentoria e mostrar a sua área.</li>
        <li>Avisar de sessões, tarefas, materiais novos e comunicados da {EMPRESA}.</li>
      </ul>

      <h2>Onde ficam</h2>
      <p>
        Em serviços contratados para operar a área: Notion (conteúdo da mentoria), Supabase (acesso e respostas),
        Vercel (hospedagem) e, para as notificações, Apple Push Notification service e Firebase Cloud Messaging.
        Esses serviços tratam os dados só para prestar o serviço.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Pela LGPD você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento, pelo e-mail{' '}
        <a href={`mailto:${CONTATO}`} className="text-marca underline underline-offset-2">
          {CONTATO}
        </a>
        .
      </p>

      <h2>Excluir a conta</h2>
      <p>
        Dentro da área (no app ou no navegador), em <strong className="font-medium text-texto">Excluir minha conta</strong>
        , ou pelo endereço{' '}
        <a href="/conta/excluir" className="text-marca underline underline-offset-2">
          /conta/excluir
        </a>
        . O acesso é desligado na hora e as notificações param. Os registros da mentoria são apagados pela equipe,
        exceto o que a lei obrigar a guardar.
      </p>

      <h2>Notificações</h2>
      <p>Você pode desligar as notificações a qualquer momento nos ajustes do celular.</p>
    </main>
  );
}
