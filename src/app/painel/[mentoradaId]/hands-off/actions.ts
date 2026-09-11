'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirSessao } from '@/lib/session';
import { exigirMentorada } from '@/lib/notion/guard';
import { normalizarId } from '@/lib/notion/carteira';
import { paginaPertenceA } from '@/lib/notion/mentorada';
import { atualizarHandsoff, criarHandsoff } from '@/lib/notion/handsoff';
import { relationIds } from '@/lib/notion/props';
import { getPage } from '@/lib/notion/client';
import { HANDSOFF, HANDSOFF_SECOES, type HandsoffSecaoKey } from '@/lib/notion/config';

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
  if (!dataSessao) return { erro: 'Informe a data da sessão.' };

  const secoes = Object.fromEntries(
    HANDSOFF_SECOES.map((s) => [s.key, String(form.get(s.key) ?? '').trim()]),
  ) as Record<HandsoffSecaoKey, string>;

  if (!secoes.tema) return { erro: 'Preencha o principal tema trabalhado.' };

  const handsoffId = String(form.get('handsoffId') ?? '').trim();

  try {
    if (handsoffId) {
      // Só quem assinou pode reescrever. A lista já mostra apenas os dela, mas
      // o ID veio de um campo do formulário — ou seja, do browser.
      const page = await getPage(handsoffId);
      const daTutora = relationIds(page, HANDSOFF.feitoPelaTutora).some(
        (id) => id.replace(/-/g, '') === tutoraId.replace(/-/g, ''),
      );
      if (!daTutora || !(await paginaPertenceA(mentorada, normalizarId(handsoffId)))) {
        return { erro: 'Este hands-off não é seu para editar.' };
      }

      await atualizarHandsoff(handsoffId, { dataSessao, ...secoes });
    } else {
      await criarHandsoff(
        mentorada,
        { id: tutoraId, nome: sessao.tutora.nome },
        { dataSessao, ...secoes },
      );
    }
  } catch (erro) {
    // O motivo fica no log do servidor; a tutora não tem o que fazer com ele.
    console.error('[hands-off] gravação falhou:', erro);
    return { erro: 'Não consegui salvar agora. Tente de novo em instantes.' };
  }

  revalidatePath(`/painel/${mentorada.id}`);
  redirect(`/painel/${mentorada.id}`);
}
