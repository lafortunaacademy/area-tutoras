import Image from 'next/image';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { portaDoHost, type Porta } from '@/lib/portas';
import { destinoDepoisDoLogin, getAcessoMentorada, getSessao, supabaseConfigurado } from '@/lib/session';

// Depende da sessão do request: nunca pode virar HTML estático.
export const dynamic = 'force-dynamic';
import { FormularioLogin } from './FormularioLogin';
import { BotaoTema } from '@/components/BotaoTema';
import { caminhoSeguro } from '@/lib/depoisDoLogin';

/**
 * Cada porta fala com quem bate nela.
 *
 * O endereço já diz de quem é a entrada, então a tela não precisa ser neutra:
 * a tutora é recebida como tutora, a cliente como bem-sucedida. A porta da
 * equipe é a de casa e continua sóbria.
 */
const BOAS_VINDAS: Record<Porta | 'equipe', { rotulo: string; titulo: string; texto: string; rodape: string }> = {
  tutoras: {
    rotulo: 'Área das tutoras',
    titulo: 'Olá, tutora. Seja bem-vinda à La Fortuna Academy.',
    texto:
      'Aqui você faz a gestão das suas tutorias, acompanha o andamento de cada mentorada e encontra tudo o que já está no sistema dela.',
    rodape: 'Acesso das tutoras da La Fortuna Academy.',
  },
  clientes: {
    rotulo: 'Área de membros',
    titulo: 'Olá, bem-sucedida. Bem-vinda à área de membros da La Fortuna Academy.',
    texto:
      'É aqui que ficam os registros das suas sessões e tutorias, o seu acompanhamento financeiro e tudo o que vocês constroem juntas na mentoria.',
    rodape: 'Acesso das clientes da La Fortuna Academy.',
  },
  equipe: {
    rotulo: 'Painel interno',
    titulo: '',
    texto: 'Área da equipe. Entre pelo link que chega no seu e-mail.',
    rodape: 'Acesso restrito ao time da La Fortuna Academy.',
  },
};

const MENSAGENS: Record<string, string> = {
  link_invalido: 'Esse link não veio completo. Peça um novo abaixo.',
  link_expirado:
    'Esse link não vale mais: ou já foi usado, ou foi pedido em outro navegador. Peça um novo abaixo.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; proximo?: string; email?: string }>;
}) {
  const { erro, proximo, email } = await searchParams;
  const porta = portaDoHost((await headers()).get('host')) ?? 'equipe';
  const recepcao = BOAS_VINDAS[porta];
  const voltarPara = caminhoSeguro(proximo);
  if ((await getSessao()) || (await getAcessoMentorada())) redirect(voltarPara ?? (await destinoDepoisDoLogin()));

  const aviso = erro ? (MENSAGENS[erro] ?? 'Não consegui te autenticar. Peça um novo link.') : null;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-16">
      {/* Luz suave de fundo, no tom da marca. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60rem 30rem at 70% -10%, color-mix(in oklab, var(--destaque) 22%, transparent), transparent 70%), radial-gradient(40rem 24rem at 0% 110%, color-mix(in oklab, var(--marca-suave) 70%, transparent), transparent 70%)',
        }}
      />

      <BotaoTema className="absolute top-4 right-4 sm:top-6 sm:right-6" />

      <div className="relative w-full max-w-md">
        <div className="mb-10 text-center">
          <Image
            src="/marca/la-fortuna.png"
            alt="La Fortuna Academy"
            width={2369}
            height={862}
            priority
            className="logo-marca mx-auto h-16 w-auto sm:h-20"
          />
          {/* Quem chega por um formulário é mentorada: o texto é para ela. */}
          {voltarPara?.startsWith('/formulario/') ? (
            <>
              <p className="mt-6 text-[12px] tracking-[0.35em] text-destaque uppercase">Formulário da tutoria</p>
              <p className="mt-3 text-sm text-texto-suave sm:text-base">
                Entre com o seu e-mail para responder. O link de acesso chega na sua caixa de entrada.
              </p>
            </>
          ) : (
            <>
              <p className="mt-6 text-[12px] tracking-[0.35em] text-destaque uppercase">{recepcao.rotulo}</p>
              {recepcao.titulo ? (
                <h1 className="display mt-4 text-2xl leading-snug text-balance sm:text-[28px]">{recepcao.titulo}</h1>
              ) : null}
              <p className="mt-3 text-sm text-texto-suave sm:text-base">{recepcao.texto}</p>
            </>
          )}
        </div>

        {aviso ? (
          <p className="mb-4 rounded-lg bg-parado-suave px-3 py-2 text-sm text-parado">{aviso}</p>
        ) : null}

        <div className="rounded-2xl border border-borda bg-superficie p-6 shadow-[var(--sombra)] sm:p-8">
          {supabaseConfigurado() ? (
            <FormularioLogin proximo={voltarPara} email={email} />
          ) : (
            <p className="text-sm text-texto-suave">
              Faltam as credenciais do Supabase. Copie <code>.env.local.example</code> para{' '}
              <code>.env.local</code> e preencha antes de entrar.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-texto-suave">
          {voltarPara?.startsWith('/formulario/') ? 'Acesso das mentoradas da La Fortuna Academy.' : recepcao.rodape}
        </p>
      </div>
    </main>
  );
}
