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

/** Propriedades da base "Área das tutoras" (uma linha por mentorada). */
export const MENTORADA = {
  nome: 'Cliente',
  status: 'Status',
  mentoria: 'Mentoria',
  areaDaCliente: 'Área da cliente',
  /**
   * Relation da mentorada para a tutora responsável. Se essa propriedade não
   * existir na base, a carteira é derivada do Planejamento estratégico —
   * veja `carteira.ts`.
   */
  tutora: 'Tutora',
} as const;

/** Valor de `Status` que conta como mentorada ativa. */
export const STATUS_ATIVA = 'Ativa';

/** Propriedades da base "Planejamento estratégico". */
export const PLANEJAMENTO = {
  objetivo: 'Objetivo',
  status: 'Status',
  trimestre: 'Trimestre',
  mes: 'Mês',
  pilar: 'Pilar',
  tutoria: 'Tutoria',
  ano: 'Ano',
  areaDaMentorada: 'Área da mentorada',
  areaDeTutora: 'Área de tutora',
} as const;

/** Propriedades da base "Briefings". */
export const BRIEFINGS = {
  titulo: 'Briefing',
  data: 'Data',
  mentoria: 'Mentoria',
  paraATutora: 'Para a tutora:',
  mentorada: 'Área da mentorada',
} as const;

/** Propriedades da base "Hands-off" (a única base em que o app ESCREVE). */
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
