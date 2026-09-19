import { NextResponse, type NextRequest } from 'next/server';
import { normalizarId } from '@/lib/notion/carteira';
import {
  SessaoInvalida,
  conteudoDaSessao,
  salvarParteDaSessao,
  type ParteDaSessao,
} from '@/lib/notion/sessoesDaMentorada';
import { tarefasDaMentorada } from '@/lib/notion/tarefas';
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
    const [dados, tarefas] = await Promise.all([
      conteudoDaSessao(normalizarId(mentoradaId), normalizarId(sessaoId)),
      tarefasDaMentorada(normalizarId(mentoradaId)).catch(() => null),
    ]);
    if (!dados) return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
    return NextResponse.json({ ...dados, tarefas, podeEditar: permissao.podeEditar });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sessaoId: string }> }) {
  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  const permissao = mentoradaId ? await permissaoNasTutorias(mentoradaId, 'equipe') : null;
  if (!mentoradaId || !permissao?.podeEditar) {
    return NextResponse.json({ erro: 'Sem permissão para editar.' }, { status: 403 });
  }

  // Vídeo da gravação chega como arquivo; o resto, como JSON.
  const multipart = request.headers.get('content-type')?.startsWith('multipart/form-data');
  const corpo = multipart
    ? await request
        .formData()
        .then((f) => ({ parte: f.get('parte'), valor: f.get('arquivo') }) as Record<string, unknown>)
        .catch(() => null)
    : ((await request.json().catch(() => null)) as Record<string, unknown> | null);
  if (!corpo) return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 });

  const { sessaoId } = await params;
  const PARTES: ParteDaSessao[] = ['resumo', 'anotacoes', 'transcricao', 'gravacao'];

  // Só o conteúdo de dentro da sessão (resumo, anotações, transcrição, gravação):
  // status, nome, tutoras e datas quem ajusta é o administrativo.
  if (typeof corpo.parte === 'string') {
    const valido = typeof corpo.valor === 'string' || (corpo.valor instanceof File && corpo.parte === 'gravacao');
    if (!PARTES.includes(corpo.parte as ParteDaSessao) || !valido) {
      return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 });
    }
    try {
      const conteudo = await salvarParteDaSessao(
        normalizarId(mentoradaId),
        normalizarId(sessaoId),
        corpo.parte as ParteDaSessao,
        corpo.valor as string | File,
      );
      if (!conteudo) return NextResponse.json({ erro: 'Sessão não encontrada.' }, { status: 404 });
      return NextResponse.json({ conteudo });
    } catch (e) {
      if (e instanceof SessaoInvalida) return NextResponse.json({ erro: e.message }, { status: 400 });
      return NextResponse.json({ erro: 'Não foi possível salvar agora.' }, { status: 502 });
    }
  }

  return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 });
}
