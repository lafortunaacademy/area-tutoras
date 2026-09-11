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

/**
 * Títulos das bases no Notion.
 *
 * ⚠️ Na prática o resolver NÃO acha nenhuma delas por título: na página de cada
 * mentorada as bases aparecem como visualização vinculada, e a busca da API não
 * enxerga a base de origem. Os IDs reais estão fixados em `NOTION_DB_*` no
 * .env.local — foram descobertos pegando uma linha de cada view e lendo o
 * `parent.database_id` dela. Os títulos abaixo ficam como documentação e como
 * último recurso.
 */
export const DATABASES = {
  tutoras: 'Tutoras',
  areaDasTutoras: 'Área das tutoras',
  mapas: 'Mapas das clientes',
  /** O título real é "Planejamento estratégico: objetivos". */
  planejamento: 'Planejamento estratégico: objetivos',
  briefings: 'Briefings',
  handsoff: 'Hands-off',
} as const;

export type SectionKey = keyof typeof DATABASES;

/**
 * Propriedades da base "Área das tutoras" (uma linha por mentorada).
 * 45 linhas, 44 ativas. Conferido pela API em 2026-09-10.
 */
export const MENTORADA = {
  nome: 'Cliente',
  status: 'Status',
  /**
   * A mentoria aparece duas vezes na base: um rollup `"Mentoria "` (com espaço
   * no fim) e uma fórmula `"Mentoria"`. As duas derivam de `Área da cliente`,
   * então hoje voltam vazias — quando essa base for compartilhada, uma das duas
   * passa a responder. Lemos as duas, na ordem, e ficamos com a primeira que
   * tiver valor.
   */
  mentoria: ['Mentoria ', 'Mentoria'],
  /**
   * Aponta para a página da mentorada na base **"Área clientes"** — que é uma
   * base diferente desta. É por ali que passam o mapa da cliente, o rótulo da
   * mentoria e o vínculo dos objetivos; nenhum deles usa o ID desta linha.
   */
  areaDaCliente: 'Área da cliente',
  /**
   * ⚠️ ESTA PROPRIEDADE AINDA NÃO EXISTE NO NOTION.
   *
   * É a relation "Área das tutoras → Tutoras" que ligaria cada mentorada à sua
   * tutora. Sem ela a carteira só pode ser derivada de quem já tem hands-off ou
   * briefing registrado — o que hoje cobre 4 das 15 tutoras. As outras 11
   * entram no app e veem uma lista vazia.
   *
   * No minuto em que ela existir, o caminho direto passa a funcionar sozinho:
   * o código já tenta por ele primeiro.
   */
  tutora: 'Tutora',
} as const;

/** Valor de `Status` que conta como mentorada ativa. */
export const STATUS_ATIVA = 'Ativa';

/**
 * Propriedades da base "Planejamento estratégico: objetivos" (404 linhas).
 *
 * `Área da mentorada` é relation para **"Área clientes"**, não para
 * "Área das tutoras". Filtrar com o ID errado devolve zero linhas sem erro
 * nenhum — veja `planejamento()`.
 *
 * `Área de tutora ` (com espaço no fim, sim) é rollup — só leitura.
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
  /** Rollup, e o nome tem um espaço no fim de verdade. Só leitura. */
  areaDeTutora: 'Área de tutora ',
} as const;

/**
 * Propriedades da base "Briefings" (8 linhas).
 *
 * Tem relation nas duas pontas — `Mentorada` e `Para a tutora:` —, então
 * briefing É recortável por mentorada. (A coluna `Mentorada` fica oculta na
 * view que aparece na página da mentorada; por isso ela não se vê na tela.)
 *
 * `Data` é created_time, não uma data editável.
 */
export const BRIEFINGS = {
  titulo: 'Briefing',
  data: 'Data',
  mentoria: 'Mentoria',
  paraATutora: 'Para a tutora:',
  mentorada: 'Mentorada',
} as const;

/**
 * Propriedades da base "Hands-off" (a única base em que o app ESCREVE).
 * Conferida pela API: os quatro nomes abaixo batem exatamente.
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
