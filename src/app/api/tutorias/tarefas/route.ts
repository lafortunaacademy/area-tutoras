import { NextResponse, type NextRequest } from 'next/server';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';
import { criarTarefa, tarefasDaMentorada } from '@/lib/notion/tarefas';
import { getAcessoMentorada, getSessao } from '@/lib/session';
import { normalizarId } from '@/lib/notion/carteira';

/**
 * As Tarefas da mentoria (base do Notion), para os "Próximos passos" dentro de
 * uma tutoria. Só leitura aqui: criar e marcar usam as mesmas ações da página
 * da mentorada.
 */
export async function GET(request: NextRequest) {
  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  if (!mentoradaId) return NextResponse.json({ erro: 'mentorada não informada' }, { status: 400 });
  if (!(await permissaoNasTutorias(mentoradaId))) return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });

  try {
    const tarefas = await tarefasDaMentorada(mentoradaId);
    if (!tarefas) return NextResponse.json({ tarefas: null });
    // Criar e marcar: o administrativo e a própria mentorada (as mesmas regras da página dela).
    const sessao = await getSessao();
    const acesso = sessao ? null : await getAcessoMentorada();
    const podeMexer = Boolean(
      (sessao?.real.is_admin && !sessao.verComo) || (acesso && normalizarId(acesso.notion_page_id) === normalizarId(mentoradaId)),
    );
    // Adicionar dentro de uma tutoria: quem registra a tutoria (a equipe).
    const podeAdicionar = Boolean((await permissaoNasTutorias(mentoradaId, 'equipe'))?.podeEditar);
    return NextResponse.json({
      podeMexer,
      podeAdicionar,
      tarefas: tarefas.map((t) => ({
        id: t.id,
        tarefa: t.tarefa,
        prazo: t.prazo ? t.prazo.slice(0, 10).split('-').reverse().join('/') : '',
        observacoes: t.observacoes,
        feita: t.feita,
      })),
    });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}

/** Cria um próximo passo (tarefa) na base de Tarefas da mentorada, de dentro de uma tutoria. */
export async function POST(request: NextRequest) {
  const corpo = (await request.json().catch(() => null)) as
    | { mentorada?: string; tarefa?: string; prazo?: string; observacoes?: string }
    | null;
  const tarefa = corpo?.tarefa?.trim().slice(0, 2000);
  if (!corpo?.mentorada || !tarefa) return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });

  const permissao = await permissaoNasTutorias(corpo.mentorada, 'equipe');
  if (!permissao?.podeEditar) return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });

  const prazo = /^\d{4}-\d{2}-\d{2}$/.test(corpo.prazo ?? '') ? corpo.prazo! : null;
  try {
    const criada = await criarTarefa(normalizarId(corpo.mentorada), {
      tarefa,
      prazo,
      observacoes: (corpo.observacoes ?? '').trim().slice(0, 2000),
    });
    return criada ? NextResponse.json({ ok: true }) : NextResponse.json({ erro: 'sem base de tarefas' }, { status: 404 });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
