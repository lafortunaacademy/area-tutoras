'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirSessao } from '@/lib/session';
import { exigirMentorada } from '@/lib/notion/guard';
import { criarHandsoff } from '@/lib/notion/handsoff';

export type EstadoHandsoff = { erro?: string };

/**
 * Server Action de verdade: muda estado (cria página no Notion) e depois
 * redireciona. É exatamente o caso em que vale a re-renderização que o Next faz
 * — leitura sob demanda não passa por aqui, passa pela Route Handler.
 */
export async function salvarHandsoff(
  _anterior: EstadoHandsoff,
  form: FormData,
): Promise<EstadoHandsoff> {
  const sessao = await exigirSessao();

  // Em "ver como", quem está no teclado é a admin, mas a sessão aponta para a
  // tutora previewada. Escrever aqui criaria um hands-off assinado por alguém
  // que não escreveu nada. Preview é para olhar.
  if (sessao.verComo) {
    return { erro: 'Você está vendo a área como outra tutora. Saia do preview para registrar.' };
  }

  const mentoradaId = String(form.get('mentoradaId') ?? '');
  const tutoraId = sessao.tutora.notion_tutora_page_id;

  // A autorização é refeita no servidor: o ID veio de um campo do formulário,
  // ou seja, do browser, e não vale nada por si só.
  const mentorada = await exigirMentorada(tutoraId, mentoradaId);

  const dataSessao = String(form.get('dataSessao') ?? '').trim();
  const tema = String(form.get('tema') ?? '').trim();

  if (!dataSessao) return { erro: 'Informe a data da sessão.' };
  if (!tema) return { erro: 'Preencha o principal tema trabalhado.' };

  const linhas = (campo: string) =>
    String(form.get(campo) ?? '')
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);

  let criado;
  try {
    criado = await criarHandsoff(
      mentorada,
      { id: tutoraId, nome: sessao.tutora.nome },
      {
        dataSessao,
        tema,
        resumo: linhas('resumo'),
        emocional: String(form.get('emocional') ?? '').trim(),
        tarefas: linhas('tarefas'),
      },
    );
  } catch (erro) {
    return {
      erro: erro instanceof Error ? erro.message : 'Não consegui salvar no Notion.',
    };
  }

  revalidatePath(`/painel/${mentorada.id}`);
  redirect(`/painel/${mentorada.id}?criado=${encodeURIComponent(criado.id)}`);
}
