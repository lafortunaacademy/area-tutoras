import { NextResponse, type NextRequest } from 'next/server';
import { normalizarId } from '@/lib/notion/carteira';
import { SessaoInvalida, blocoDaSessao, conteudoDaSessao, salvarParteDaSessao } from '@/lib/notion/sessoesDaMentorada';
import { responderNoBloco, type RespostaEmBloco } from '@/lib/notion/blocos';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';

/**
 * Uma sessão da mentorada. GET traz o conteúdo (só quando o cartão é aberto);
 * PATCH grava no Notion o conteúdo editado dentro dela. Vale para o administrativo,
 * a tutora e a própria mentorada; no "ver como" só lê.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ sessaoId: string }> }) {
  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  const permissao = mentoradaId ? await permissaoNasTutorias(mentoradaId, 'equipe') : null;
  if (!mentoradaId || !permissao) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
  }

  const { sessaoId } = await params;
  try {
    // As tarefas vêm por `/api/tutorias/tarefas`, que o próprio cartão chama:
    // buscá-las aqui também dobrava a espera para abrir a sessão.
    const dados = await conteudoDaSessao(normalizarId(mentoradaId), normalizarId(sessaoId));
    if (!dados) return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
    return NextResponse.json({ ...dados, podeEditar: permissao.podeEditar });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}

/**
 * Grava dentro da página da sessão: texto de uma resposta, opção marcada,
 * célula de tabela, linha nova ou arquivo. É o mesmo vocabulário das tutorias,
 * porque cada sessão nasce de um modelo diferente e pode ter qualquer um deles.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sessaoId: string }> }) {
  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  const permissao = mentoradaId ? await permissaoNasTutorias(mentoradaId, 'equipe') : null;
  if (!mentoradaId || !permissao?.podeEditar) {
    return NextResponse.json({ erro: 'Sem permissão para editar.' }, { status: 403 });
  }

  const { sessaoId } = await params;

  // Vídeo da gravação: chega como arquivo, não como JSON.
  const multipart = request.headers.get('content-type')?.startsWith('multipart/form-data');
  const corpo = multipart
    ? await request
        .formData()
        .then((f) => ({ parte: f.get('parte'), valor: f.get('arquivo') }) as Record<string, unknown>)
        .catch(() => null)
    : ((await request.json().catch(() => null)) as Record<string, unknown> | null);

  // A gravação tem caminho próprio: ela troca o vídeo da página inteira.
  if (corpo && corpo.parte === 'gravacao') {
    const valor = corpo.valor;
    if (typeof valor !== 'string' && !(valor instanceof File)) {
      return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 });
    }
    try {
      const conteudo = await salvarParteDaSessao(normalizarId(mentoradaId), normalizarId(sessaoId), 'gravacao', valor);
      if (!conteudo) return NextResponse.json({ erro: 'Sessão não encontrada.' }, { status: 404 });
      return NextResponse.json({ ok: true });
    } catch (e) {
      if (e instanceof SessaoInvalida) return NextResponse.json({ erro: e.message }, { status: 400 });
      return NextResponse.json({ erro: 'Não foi possível salvar agora.' }, { status: 502 });
    }
  }

  const resposta = validar(corpo);
  if (!resposta) return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 });

  try {
    const bloco = await blocoDaSessao(normalizarId(mentoradaId), normalizarId(sessaoId), resposta.blocoId);
    if (!bloco) return NextResponse.json({ erro: 'Bloco não encontrado nesta sessão.' }, { status: 404 });

    const id = await responderNoBloco(bloco, resposta);
    if (!id) return NextResponse.json({ erro: 'Esse campo não pode ser editado por aqui.' }, { status: 400 });
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ erro: 'Não foi possível salvar agora.' }, { status: 502 });
  }
}

function validar(c: Record<string, unknown> | null): RespostaEmBloco | null {
  if (!c || typeof c.blocoId !== 'string' || !c.blocoId) return null;
  const blocoId = normalizarId(c.blocoId);

  if (c.acao === 'marcar' && typeof c.marcado === 'boolean') return { acao: 'marcar', blocoId, marcado: c.marcado };
  if ((c.acao === 'texto' || c.acao === 'adicionar') && typeof c.texto === 'string' && c.texto.length <= 20_000) {
    return { acao: c.acao, blocoId, texto: c.texto };
  }
  if (
    c.acao === 'linhaDaTabela' &&
    Array.isArray(c.celulas) &&
    c.celulas.length <= 30 &&
    c.celulas.every((v) => typeof v === 'string' && v.length <= 2000)
  ) {
    return { acao: 'linhaDaTabela', blocoId, celulas: c.celulas as string[] };
  }
  if (c.acao === 'linha') return { acao: 'linha', blocoId };
  return null;
}
