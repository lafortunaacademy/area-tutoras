'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Eye, Loader2, Plus, X } from 'lucide-react';
import {
  alternarAcesso,
  alternarTipo,
  liberarAcesso,
  liberarAcessoTutora,
  removerAcesso,
  removerDoTime,
  removerFoto,
  salvarFoto,
  verComo,
  verComoMentorada,
  type EstadoAcesso,
} from './actions';

const inicial: EstadoAcesso = {};

export type Pessoa = {
  id: string;
  nome: string;
  email: string;
  ativa: boolean;
  /** Time interno: administradora vê tudo e mexe nas configurações. */
  admin?: boolean;
  /** Time interno: a página dela na base Tutoras, de onde vem a foto. */
  fotoId?: string | null;
  /** Time interno: o retrato enviado à mão, de quem não é tutora. */
  foto?: string | null;
  /** Clientes: a página dela no Notion, para abrir a área como ela vê. */
  mentoradaId?: string;
  /** A página dela não está mais no Notion: não há área para abrir. */
  semPagina?: boolean;
  euMesma?: boolean;
};

/**
 * O retrato de quem é do time.
 *
 * Quem é tutora tem foto na base Tutoras do Notion e é de lá que ela vem:
 * trocar lá troca aqui. Quem administra e não dá tutoria não tem página
 * nenhuma, então a foto é enviada aqui mesmo, clicando no retrato.
 */
function FotoDoTime({ pessoa }: { pessoa: Pessoa }) {
  const [estado, enviar, enviando] = useActionState(salvarFoto, inicial);
  const router = useRouter();
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (estado.ok) router.refresh();
  }, [estado.ok, router]);

  const src = pessoa.foto ?? (pessoa.fotoId ? `/api/fotos/tutoras/${pessoa.fotoId}?tamanho=mini` : null);
  const retrato =
    src && !falhou ? (
      // eslint-disable-next-line @next/next/no-img-element -- já sai reduzida
      <img
        src={src}
        alt=""
        onError={() => setFalhou(true)}
        className="size-9 shrink-0 rounded-full bg-marca-suave object-cover object-top"
      />
    ) : (
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca-suave text-[12px] font-medium text-marca"
      >
        {pessoa.nome.charAt(0)}
      </span>
    );

  // A foto do Notion não se troca por aqui: lá é a fonte.
  if (pessoa.fotoId) return retrato;

  return (
    <div className="shrink-0">
      <form action={enviar}>
        <input type="hidden" name="id" value={pessoa.id} />
        <label
          title={estado.erro || (pessoa.foto ? 'Trocar a foto' : 'Adicionar uma foto')}
          className="relative block cursor-pointer"
        >
          {retrato}
          <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-marca text-marca-contraste">
            {enviando ? <Loader2 aria-hidden size={10} className="animate-spin" /> : <Camera aria-hidden size={10} />}
          </span>
          <input
            type="file"
            name="foto"
            accept="image/*"
            disabled={enviando}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="sr-only"
          />
          <span className="sr-only">Foto de {pessoa.nome}</span>
        </label>
      </form>

      {pessoa.foto ? (
        <form action={removerFoto}>
          <input type="hidden" name="id" value={pessoa.id} />
          <button type="submit" className="mt-1 block w-full text-center text-[10px] text-texto-suave hover:text-marca">
            tirar
          </button>
        </form>
      ) : null}
    </div>
  );
}

/**
 * O tipo de acesso de quem é do time. Troca na hora: o `select` manda o
 * formulário sozinho, sem botão de salvar.
 */
function TipoDeAcesso({ pessoa }: { pessoa: Pessoa }) {
  if (pessoa.euMesma) {
    return <span className="shrink-0 text-[12px] text-texto-suave">você · administradora</span>;
  }

  return (
    <form action={alternarTipo}>
      <input type="hidden" name="id" value={pessoa.id} />
      <select
        name="tipo"
        defaultValue={pessoa.admin ? 'admin' : 'tutora'}
        aria-label={`Tipo de acesso de ${pessoa.nome}`}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="shrink-0 rounded-lg border border-borda bg-superficie px-2 py-1 text-[12px] outline-none focus:border-marca"
      >
        <option value="admin">Administradora</option>
        <option value="tutora">Tutora</option>
      </select>
    </form>
  );
}

/**
 * O interruptor de acesso: ligado, a pessoa entra; desligado, o cadastro
 * continua aqui mas o login para de funcionar. É um formulário, não um
 * `onChange` — assim a decisão acontece no servidor, que é quem manda.
 */
function Interruptor({ tabela, pessoa }: { tabela: 'tutoras' | 'mentoradas_acesso'; pessoa: Pessoa }) {
  return (
    <form action={alternarAcesso}>
      <input type="hidden" name="tabela" value={tabela} />
      <input type="hidden" name="id" value={pessoa.id} />
      <input type="hidden" name="ativa" value={pessoa.ativa ? 'false' : 'true'} />
      <button
        type="submit"
        role="switch"
        aria-checked={pessoa.ativa}
        aria-label={`${pessoa.ativa ? 'Tirar o acesso de' : 'Dar acesso a'} ${pessoa.nome}`}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
          pessoa.ativa ? 'bg-marca' : 'bg-superficie-2'
        }`}
      >
        <span
          aria-hidden
          className={`size-5 rounded-full bg-superficie shadow-[var(--sombra)] transition-transform ${
            pessoa.ativa ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </form>
  );
}

/** Uma lista de quem entra no app, com o interruptor de cada pessoa. */
export function ListaDeAcessos({
  tabela,
  pessoas,
  removivel,
  comVerComo,
}: {
  tabela: 'tutoras' | 'mentoradas_acesso';
  pessoas: Pessoa[];
  /** Clientes podem sair da lista de vez; o time interno só liga e desliga. */
  removivel?: boolean;
  /** No time interno, o atalho para abrir a área como aquela tutora. */
  comVerComo?: boolean;
}) {
  if (pessoas.length === 0) {
    return <p className="px-5 py-6 text-center text-sm text-texto-suave">Ninguém liberado ainda.</p>;
  }

  return (
    <ul className="divide-y divide-borda/60">
      {pessoas.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
          {tabela === 'tutoras' ? <FotoDoTime pessoa={p} /> : null}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{p.nome}</p>
            <p className="text-xs break-all text-texto-suave">{p.email}</p>
          </div>

          {tabela === 'tutoras' ? <TipoDeAcesso pessoa={p} /> : null}

          {tabela === 'mentoradas_acesso' && p.semPagina ? (
            <span className="shrink-0 text-[12px] text-texto-suave italic" title="A página dela saiu do Notion ou foi para a lixeira.">
              sem página no Notion
            </span>
          ) : null}

          {tabela === 'mentoradas_acesso' && p.mentoradaId && !p.semPagina ? (
            <form action={verComoMentorada}>
              <input type="hidden" name="mentoradaId" value={p.mentoradaId} />
              <button
                type="submit"
                title="Abrir a área como ela vê"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-borda px-2.5 py-1 text-[12px] text-texto-suave transition hover:border-marca hover:text-marca"
              >
                <Eye aria-hidden size={13} />
                <span className="hidden sm:inline">Ver como</span>
              </button>
            </form>
          ) : null}

          {/* "Ver como" é para tutora: quem administra já enxerga tudo, e o
              recorte de tutora dela viria vazio. */}
          {comVerComo && !p.euMesma && !p.admin ? (
            <form action={verComo}>
              <input type="hidden" name="tutoraId" value={p.id} />
              <button
                type="submit"
                title="Abrir a área como ela vê"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-borda px-2.5 py-1 text-[12px] text-texto-suave transition hover:border-marca hover:text-marca"
              >
                <Eye aria-hidden size={13} />
                <span className="hidden sm:inline">Ver como</span>
              </button>
            </form>
          ) : null}

          <span className={`hidden text-[12px] sm:inline ${p.ativa ? 'text-ok' : 'text-texto-suave'}`}>
            {p.ativa ? 'com acesso' : 'sem acesso'}
          </span>
          <Interruptor tabela={tabela} pessoa={p} />

          {removivel && !p.euMesma ? (
            <form action={tabela === 'tutoras' ? removerDoTime : removerAcesso}>
              <input type="hidden" name="id" value={p.id} />
              <button
                type="submit"
                aria-label={`Apagar o acesso de ${p.email}`}
                title="Apagar da lista"
                className="rounded-lg p-1.5 text-texto-suave transition hover:text-parado"
              >
                <X aria-hidden size={14} />
              </button>
            </form>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Libera mais alguém. Quem é a pessoa sai de uma lista do Notion — é o
 * cadastro de lá que recorta o que ela vê —, e o e-mail é digitado aqui.
 */
export function NovoAcesso({
  tipo,
  pessoas,
}: {
  tipo: 'tutora' | 'cliente';
  /** As opções do Notion: tutoras do HUB ou mentoradas do modelo novo. */
  pessoas: { id: string; nome: string }[];
}) {
  const doTime = tipo === 'tutora';
  const [estado, acao, enviando] = useActionState(doTime ? liberarAcessoTutora : liberarAcesso, inicial);
  // No time, quem dá tutoria sai da lista do Notion (é de lá que vem o recorte
  // dela); quem só administra tem o nome digitado aqui mesmo.
  const [comoAdmin, setComoAdmin] = useState(false);

  // Depois de liberar, a lista acima precisa chegar de novo do servidor: sem
  // isso a pessoa recém-liberada só aparece quando alguém recarrega a página.
  const router = useRouter();
  useEffect(() => {
    if (estado.ok) router.refresh();
  }, [estado.ok, router]);

  return (
    <form action={acao} className="flex flex-wrap items-center gap-2 border-t border-borda px-5 py-3">
      {doTime ? (
        <select
          name="tipo"
          defaultValue="tutora"
          onChange={(e) => setComoAdmin(e.currentTarget.value === 'admin')}
          aria-label="Tipo de acesso"
          className="shrink-0 rounded-lg border border-borda bg-superficie px-3 py-1.5 text-sm outline-none focus:border-marca"
        >
          <option value="tutora">Tutora</option>
          <option value="admin">Administradora</option>
        </select>
      ) : null}

      {doTime && comoAdmin ? (
        <input
          type="text"
          name="nome"
          required
          placeholder="nome de quem entra"
          className="min-w-0 flex-1 rounded-lg border border-borda bg-superficie px-3 py-1.5 text-sm outline-none focus:border-marca"
        />
      ) : (
        <select
          name={doTime ? 'tutoraId' : 'mentoradaId'}
          required
          defaultValue=""
          aria-label={doTime ? 'Quem é, no HUB de tutoras' : 'Qual mentorada'}
          className="min-w-0 flex-1 rounded-lg border border-borda bg-superficie px-3 py-1.5 text-sm outline-none focus:border-marca"
        >
          <option value="" disabled>
            {doTime ? 'Escolha a tutora' : 'Escolha a mentorada'}
          </option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      )}

      <input
        type="email"
        name="email"
        required
        placeholder="e-mail de acesso"
        className="min-w-0 flex-1 rounded-lg border border-borda bg-superficie px-3 py-1.5 text-sm outline-none focus:border-marca"
      />

      <button
        type="submit"
        disabled={enviando}
        className="inline-flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-xs font-medium text-marca-contraste transition hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? <Loader2 aria-hidden size={12} className="animate-spin" /> : <Plus aria-hidden size={12} />}
        Liberar
      </button>

      <p aria-live="polite" className="w-full text-xs">
        {estado.erro ? <span className="text-parado">{estado.erro}</span> : null}
        {estado.ok ? <span className="text-ok">{estado.ok}</span> : null}
      </p>
    </form>
  );
}
