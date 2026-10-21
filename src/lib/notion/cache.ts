import 'server-only';
import { unstable_cache } from 'next/cache';

/**
 * Guarda por alguns segundos as leituras do Notion que se repetem em toda tela.
 *
 * O `cache` do React só vale dentro de uma requisição: a cada clique o app
 * buscava de novo a lista de mentoradas, as tutoras e os ciclos — e cada ida ao
 * Notion custa segundos. Aqui essas listas ficam guardadas por pouco tempo,
 * então a navegação fica instantânea e o conteúdo continua vindo do Notion.
 *
 * Vale só para dado de catálogo (listas que mudam de vez em quando). O conteúdo
 * de cada mentorada — sessões, tarefas, respostas — continua sendo lido na hora,
 * porque é ele que precisa refletir o Notion no mesmo segundo.
 */

/** Listas que mudam pouco: nomes, fotos, ciclos. */
export const MINUTO = 60;

export function guardado<T>(chave: string, fn: () => Promise<T>, segundos: number = MINUTO): () => Promise<T> {
  return unstable_cache(fn, [chave], { revalidate: segundos, tags: ['notion'] });
}
