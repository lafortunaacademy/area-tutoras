/**
 * ÚNICO lugar do app que conhece os nomes das coisas no Notion.
 *
 * Se a Fernanda renomear uma propriedade ou uma base, é aqui que se muda —
 * nenhum outro arquivo escreve um nome de propriedade literal.
 *
 * Os valores abaixo vieram da leitura da estrutura atual (workspace
 * "La Fortuna Academy"). Rode `npm run notion:doctor` depois de configurar o
 * token: ele confere cada nome contra o schema real e aponta divergências.
 */

/** Títulos das bases no Notion, usados pelo resolver para descobrir os IDs. */
export const DATABASES = {
  tutoras: 'Tutoras',
  areaDasTutoras: 'Área das tutoras',
  mapas: 'Mapas das clientes',
  planejamento: 'Planejamento estratégico',
  briefings: 'Briefings',
  handsoff: 'Hands-off',
} as const;

export type SectionKey = keyof typeof DATABASES;

/**
 * Propriedades da base "Área das tutoras" (uma linha por mentorada).
 *
 * Conferido no Notion em 2026-09-10: a base tem só Status, Cliente, Mentoria
 * (rollup) e Área da cliente (relation) — mais uma Mentoria oculta.
 */
export const MENTORADA = {
  nome: 'Cliente',
  status: 'Status',
  mentoria: 'Mentoria',
  areaDaCliente: 'Área da cliente',
  /**
   * ⚠️ ESTA PROPRIEDADE AINDA NÃO EXISTE NO NOTION.
   *
   * É a relation "Área das tutoras → Tutoras" que ligaria cada mentorada à sua
   * tutora. Sem ela, não existe caminho direto e barato para montar a carteira,
   * e `carteira.ts` cai no caminho derivado (bem mais frágil — veja lá).
   *
   * No minuto em que a Fernanda criar essa relation, o caminho direto passa a
   * funcionar sozinho: o código já tenta por ele primeiro.
   */
  tutora: 'Tutora',
} as const;

/** Valor de `Status` que conta como mentorada ativa. */
export const STATUS_ATIVA = 'Ativa';

/**
 * Propriedades da base "Planejamento estratégico".
 *
 * `Área de tutora` é ROLLUP, não relation — a API não filtra por ela de forma
 * confiável. Serve para exibir, nunca para recortar. O recorte sai de
 * `Área da mentorada`, que é relation de verdade, depois da carteira já ter
 * autorizado a mentorada.
 */
export const PLANEJAMENTO = {
  objetivo: 'Objetivo',
  status: 'Status',
  trimestre: 'Trimestre',
  mes: 'Mês',
  pilar: 'Pilar',
  tutoria: 'Tutoria',
  ano: 'Ano',
  areaDaMentorada: 'Área da mentorada',
  /** Rollup — só leitura. Não usar em filtro. */
  areaDeTutora: 'Área de tutora',
} as const;

/**
 * Propriedades da base "Briefings".
 *
 * ⚠️ Não existe relation para a mentorada. Um briefing sabe para QUAL TUTORA
 * ele é, mas não sobre qual mentorada — então briefing não pode ser recortado
 * por mentorada, só por tutora. É por isso que a seção vive em /painel/briefings
 * e não dentro da página de uma mentorada.
 */
export const BRIEFINGS = {
  titulo: 'Briefing',
  data: 'Data',
  mentoria: 'Mentoria',
  paraATutora: 'Para a tutora:',
} as const;

/**
 * Propriedades da base "Hands-off" (a única base em que o app ESCREVE).
 *
 * A única base com relations de verdade nas DUAS pontas — tutora e mentorada.
 * Hoje é ela que sustenta a carteira derivada.
 */
export const HANDSOFF = {
  nome: 'Nome',
  dataDaSessao: 'Data da sessão',
  feitoPelaTutora: 'Feito pela tutora:',
  mentorada: 'Mentorada',
} as const;

/** Propriedades da base "Mapas das clientes". */
export const MAPA = {
  titulo: 'Nome',
  mentorada: 'Área da mentorada',
} as const;

/**
 * Seções do corpo de um Hands-off, na ordem em que aparecem no Notion.
 * O formulário do app é gerado a partir desta lista.
 */
export const HANDSOFF_SECOES = [
  {
    key: 'tema',
    titulo: 'Principal tema trabalhado',
    ajuda: 'uma frase',
    formato: 'linha',
  },
  {
    key: 'resumo',
    titulo: 'Resumo do que foi feito',
    ajuda: '3-5 bullets',
    formato: 'bullets',
  },
  {
    key: 'emocional',
    titulo: 'Estado emocional da cliente ao sair',
    ajuda: 'observação de negócio',
    formato: 'texto',
  },
  {
    key: 'tarefas',
    titulo: 'Exercícios ou tarefas deixadas',
    ajuda: '',
    formato: 'bullets',
  },
] as const;

export type HandsoffSecaoKey = (typeof HANDSOFF_SECOES)[number]['key'];
