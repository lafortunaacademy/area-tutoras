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

/**
 * Base "Mapas das clientes": o retrato da mentorada preenchido por ela.
 *
 * Liga direto na linha da mentorada em "Área das tutoras" pela relation
 * `Área da tutora` — apesar do nome, não é a tutora.
 *
 * O mapa é um formulário, não uma página: o que interessa são os campos, não o
 * corpo. Por isso a tela mostra campo a campo em vez de um item para expandir.
 */
export const MAPA = {
  titulo: 'Nome',
  mentorada: 'Área da tutora',
} as const;

/**
 * Os campos do mapa, na ordem em que aparecem no card do Notion.
 *
 * Cada campo tem um par: o valor e a `Legenda "..."` que dá o rótulo visível.
 * Os dois nomes divergem em vários casos — o valor mora em `Time`, mas a
 * mentorada lê "Pessoas no time"; `Fontes de rendas` aparece como "Fonte de
 * receita do seu negócio". Por isso o par é explícito aqui, e não deduzido por
 * semelhança de nome.
 *
 * O rótulo exibido é o CONTEÚDO da legenda (é ele que está na tela dela); o
 * nome do campo só entra como reserva, se a legenda estiver vazia.
 */
export const MAPA_CAMPOS: ReadonlyArray<{ valor: string; legenda?: string; reserva: string }> = [
  { valor: 'Idade', legenda: 'Legenda "Idade"', reserva: 'Idade' },
  { valor: 'Instagram', legenda: 'Legenda "Instagram"', reserva: 'Instagram' },
  { valor: 'O que faz', legenda: 'Legenda "O que faz"', reserva: 'O que faz' },
  { valor: 'Persona (cliente)', legenda: 'Legenda "Persona (cliente)"', reserva: 'Persona' },
  {
    valor: 'Problemas que o trabalho resolve',
    legenda: 'Legenda "Problemas que o trabalho resolve"',
    reserva: 'Problemas que o trabalho resolve',
  },
  { valor: 'Time', legenda: 'Legenda "Pessoas no time"', reserva: 'Pessoas no time' },
  {
    valor: 'Fontes de rendas',
    legenda: 'Legenda "Fonte de receita do seu negócio"',
    reserva: 'Fonte de receita do seu negócio',
  },
  {
    valor: 'Origem dos clientes',
    legenda: 'Legenda "Origem dos clientes"',
    reserva: 'Origem dos clientes',
  },
  {
    valor: 'Entrega e atendimentos',
    legenda: 'Legenda "Tipo de entrega"',
    reserva: 'Tipo de entrega',
  },
  {
    valor: 'Sua trajetória',
    legenda: 'Legenda "Sua tragetória profissional"',
    reserva: 'Sua trajetória profissional',
  },
  { valor: 'Faturamento', legenda: 'Legenda "Faturamento"', reserva: 'Faturamento' },
  {
    valor: 'Produtos e serviços',
    legenda: 'Legenda "Produtos e serviços"',
    reserva: 'Produtos e serviços',
  },
  { valor: 'Tempo de atuação', legenda: 'Legenda "Tempo de atuação"', reserva: 'Tempo de atuação' },
  { valor: 'Posicionamento ', legenda: 'Legenda "Posicionamento"', reserva: 'Posicionamento' },
  {
    valor: 'Outras informações sobre (você e seu negócio)',
    legenda: 'Legenda "Outras informações sobre você e seu negócio"',
    reserva: 'Outras informações sobre você e seu negócio',
  },
  { valor: 'Nascimento', reserva: 'Nascimento' },
];

/**
 * Campos que existem só para rotular o formulário da mentorada
 * (`Legenda "Idade"`, `Legenda "Instagram"`…). São o rótulo, não a resposta.
 */
export function ehLegenda(nome: string): boolean {
  return nome.trim().toLowerCase().startsWith('legenda');
}

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
