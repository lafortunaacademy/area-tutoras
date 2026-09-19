import 'server-only';
import { carteiraDaTutora, normalizarId } from '@/lib/notion/carteira';
import { TEMAS_DE_TUTORIA } from '@/lib/notion/config';
import { especialidadesDasTutoras } from '@/lib/notion/hub';
import { sessoesPorCiclo } from '@/lib/notion/sessoesDaMentorada';
import { caminhoDoMaterial } from './modelo';

/**
 * As sessões (base de Sessões do Notion, a mesma da página Sessões) que um
 * registro de tutoria pode citar. É dela que vem a data da caixinha.
 *
 * Primeiro as da área (pelo tema da sessão ou pela especialidade da tutora);
 * se a área não tiver nenhuma, todas as da mentorada. Mais recentes primeiro.
 */
export type SessaoParaRegistro = { id: string; titulo: string; data: string | null; tutoras: string[] };

const normal = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();

export async function sessoesParaRegistro(mentoradaId: string, materialId: string): Promise<SessaoParaRegistro[]> {
  const [carteira, caminho, especialidades] = await Promise.all([
    carteiraDaTutora(),
    caminhoDoMaterial(materialId),
    especialidadesDasTutoras(),
  ]);
  const mentorada = carteira.find((m) => m.id === normalizarId(mentoradaId));
  if (!mentorada) return [];

  const { sessoes } = await sessoesPorCiclo(mentorada);
  const nomes = normal([caminho?.tutoria, ...(caminho?.grupos ?? [])].filter(Boolean).join(' '));
  const tema = TEMAS_DE_TUTORIA.find((t) => nomes.includes(t.trecho));

  const daArea = tema
    ? sessoes.filter(
        (s) =>
          tema.temas.some((t) => normal(t) === normal(s.tema)) ||
          s.tutoraIds.some((id) => (especialidades.get(normalizarId(id)) ?? []).some((e) => tema.especialidades.some((x) => normal(x) === normal(e)))),
      )
    : [];

  return (daArea.length ? daArea : sessoes)
    .map((s) => ({ id: s.id, titulo: s.sessao || 'Sessão sem nome', data: s.dataRealizada ?? s.dataPrevista, tutoras: s.tutoras }))
    .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
}

/** A área de um material, para o nome da caixinha: "Produto", "Investimentos", "Design"… */
export async function areaDoMaterial(materialId: string): Promise<string | null> {
  const caminho = await caminhoDoMaterial(materialId);
  return caminho ? (caminho.grupos[0] ?? caminho.tutoria) : null;
}
