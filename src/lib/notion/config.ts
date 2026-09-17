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
  /**
   * O controle de tutorias. O que aparece na página como "Acompanhamento das
   * mentoradas" é uma visualização vinculada sem fonte própria — a base de
   * verdade é esta, com 961 sessões.
   */
  tutorias: 'Acompanhamento de clientes',
  briefings: 'Briefings',
  handsoff: 'Hands-off',
  /** A área individual de cada cliente: é dela que pendura todo o conteúdo. */
  areaClientes: 'Área clientes',
} as const;

export type SectionKey = keyof typeof DATABASES;

/**
 * Propriedades da base **"Área clientes"** — a lista de mentoradas.
 *
 * Até 2026-09-12 a lista vinha de "Área das tutoras", mas a reorganização moveu
 * tudo para a área individual da cliente e o Notion migrou aquela base para o
 * modelo novo de data sources, cortando o acesso. "Área clientes" é a fonte
 * certa agora: é a mesma página de onde já pendura briefings, objetivos, mapa e
 * hands-off, e traz nome, mentoria, situação e foto numa consulta só.
 *
 * Consequência boa: `areaDaClienteIds` deixa de ser um desvio — a linha da lista
 * JÁ É a página da cliente.
 */
export const MENTORADA = {
  nome: 'Cliente',
  /** Ativa/Inativa. ("Situação ", com espaço no fim, é outra coisa: Fluindo, Atenção…) */
  status: 'Status',
  mentoria: 'Mentoria',
} as const;

/**
 * Status que tiram a mentorada da lista.
 *
 * É lista de exclusão, não de inclusão: status novo criado no Notion aparece
 * por padrão, em vez de sumir sem ninguém entender por quê.
 */
export const STATUS_INATIVOS = ['Inativa'] as const;

/**
 * Ordem dos objetivos na tela: o que está em andamento primeiro, o que ainda
 * não começou no meio, e o que já acabou no fim.
 *
 * A tutora abre esta tabela para saber onde pegar o trabalho — não para revisar
 * o que já foi feito. Status fora desta lista cai antes dos concluídos.
 */
export const ORDEM_STATUS_OBJETIVO = [
  'Em andamento',
  'A iniciar',
  'Concluído',
  'Concluida',
  'Cancelado',
] as const;

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
  /** Com espaço no fim, sim. */
  mentorada: 'Mentorada ',
  /**
   * Ainda não existe. Se for criada como Número em "Hands-off", o quanto a
   * tutora recebeu por cada sessão passa a aparecer no Início, mês a mês e no
   * total — de graça, porque sai da mesma linha que já registra a sessão.
   */
  valor: 'Valor',
} as const;

/**
 * Ícone da página de Hands-off, igual ao dos registros criados à mão.
 *
 * Sem ele a página nasce com o ícone genérico de documento e salta aos olhos na
 * listagem do Notion qual veio do app e qual veio de dentro do Notion. A ideia é
 * o contrário: que não dê para diferenciar.
 */
export const HANDSOFF_ICONE = { name: 'info-alternate', color: 'brown' } as const;

/**
 * Quanto a tutora recebe por sessão, conforme a mentoria da mentorada.
 *
 * Não existe no Notion: veio da Luíza em 2026-09-11. Enquanto não virar um campo
 * lá, é aqui que se corrige um preço.
 *
 * A regra é a PRIMEIRA da lista que casar. Importa porque há mentorada com mais
 * de uma mentoria ("Pronta Para Fazer Dinheiro, My Partner Sprint") — nesse caso
 * vale My Partner. Se a regra certa for outra, é só inverter a ordem.
 */
export const VALOR_POR_SESSAO: ReadonlyArray<{ contem: string; valor: number }> = [
  { contem: 'my partner', valor: 450 },
  { contem: 'pronta para fazer dinheiro', valor: 350 },
];

/**
 * Propriedades da base "Acompanhamento de clientes": o controle de tutorias.
 *
 * `Tutora` é campo de PESSOA (usuário do Notion), não relation para a base
 * Tutoras — então a ligação com quem está logada passa pelo e-mail do usuário,
 * não por ID de página.
 */
export const TUTORIA = {
  sessao: 'Sessão',
  tutora: 'Tutora',
  /** Relation para a base Tutoras — é por ela que o progresso da mentoria agrupa. */
  tutoras: 'Tutoras',
  mentorada: 'Mentorada',
  status: 'Status',
  dataRealizada: 'Data realizada',
  dataPrevista: 'Data prevista',
  mesPrevisto: 'Mês previsto',
  /** Select "Ciclo 2026", "Ciclo 2027"… — um ciclo por ano. */
  ciclo: 'Ciclo',
} as const;

/** O ciclo que o progresso da mentoria mostra: o do ano corrente. */
export function cicloAtual(hoje = new Date()): string {
  return `Ciclo ${hoje.getFullYear()}`;
}

/** Só estas contam como tutoria dada. */
export const TUTORIA_REALIZADA = 'Realizada';

/** Rótulo das sessões sem nenhuma tutora na relation `Tutoras`. */
export const SEM_TUTORA = 'Sem tutora';

/** Sessões que ainda vão acontecer. "Não Realizado" não entra em nenhum dos lados. */
export const TUTORIA_A_REALIZAR: readonly string[] = ['A realizar', 'Agendar', 'Agendado'];

/** Propriedades da base "Tutoras" — o perfil de quem está logada. */
export const TUTORA = {
  nome: 'Tutora',
  foto: 'Foto',
  status: 'Status',
  areaDoMetodo: 'Área do metódo',
  especialidades: 'Áreas/Especialidades',
  programa: 'Programa',
  mentoria: 'Mentoria',
  topicos: 'Principais tópicos',
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
  mentorada: 'Mentorada',
  /**
   * Ainda não existe na base. Quando for criada (tipo Arquivo, como a `Foto` da
   * base Tutoras), a foto aparece sozinha no mapa — a tela já a procura.
   */
  foto: 'Foto',
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
export const MAPA_CAMPOS: ReadonlyArray<{
  valor: string;
  legenda?: string;
  reserva: string;
  /** Texto corrido, que pede a largura toda em vez de meia coluna. */
  longo?: boolean;
}> = [
  { valor: 'Idade', legenda: 'Legenda "Idade"', reserva: 'Idade' },
  { valor: 'Instagram', legenda: 'Legenda "Instagram"', reserva: 'Instagram' },
  {
    longo: true,
    valor: 'O que o seu negócio faz hoje?',
    legenda: 'Legenda "O que faz"',
    reserva: 'O que faz',
  },
  { valor: 'Profissão', reserva: 'Profissão' },
  { longo: true, valor: 'Persona (cliente)', legenda: 'Legenda "Persona (cliente)"', reserva: 'Persona' },
  {
    longo: true,
    valor: 'Problemas que o trabalho resolve',
    legenda: 'Legenda "Problemas que o trabalho resolve"',
    reserva: 'Problemas que o trabalho resolve',
  },
  { longo: true, valor: 'Time', legenda: 'Legenda "Pessoas no time"', reserva: 'Pessoas no time' },
  {
    longo: true,
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
    longo: true,
    valor: 'Sua trajetória',
    legenda: 'Legenda "Sua tragetória profissional"',
    reserva: 'Sua trajetória profissional',
  },
  { valor: 'Faturamento', legenda: 'Legenda "Faturamento"', reserva: 'Faturamento' },
  {
    longo: true,
    valor: 'Produtos e serviços',
    legenda: 'Legenda "Produtos e serviços"',
    reserva: 'Produtos e serviços',
  },
  { valor: 'Tempo de atuação', legenda: 'Legenda "Tempo de atuação"', reserva: 'Tempo de atuação' },
  { valor: 'Posicionamento ', legenda: 'Legenda "Posicionamento"', reserva: 'Posicionamento' },
  {
    longo: true,
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
 * As seções do Hands-off, na ordem e com os ícones do template do Notion.
 *
 * Copiado do que a Fernanda montou lá: cada seção é um callout com um ícone
 * nativo do Notion (não emoji), em marrom. O formulário do app é gerado desta
 * lista, e a página criada sai igual à criada à mão — mesmas oito seções, mesmos
 * ícones, mesma ordem. Seção nova aqui aparece nos dois lugares de uma vez.
 */
export const HANDSOFF_SECOES = [
  {
    key: 'tema',
    titulo: 'Principal tema trabalhado',
    ajuda: 'uma frase',
    icone: 'push-pin',
    formato: 'linha',
  },
  {
    key: 'resumo',
    titulo: 'Resumo do que foi feito',
    ajuda: '3-5 bullets',
    icone: 'list',
    formato: 'bullets',
  },
  {
    key: 'emocional',
    titulo: 'Estado emocional da cliente ao sair',
    ajuda: 'observação de negócio',
    icone: 'stars',
    formato: 'texto',
  },
  {
    key: 'tarefas',
    titulo: 'Exercícios ou tarefas deixadas',
    ajuda: '',
    icone: 'checklist',
    formato: 'texto',
  },
  {
    key: 'atencao',
    titulo: 'Pontos de atenção para a próxima tutora',
    ajuda: '',
    icone: 'exclamation-mark-double',
    formato: 'texto',
  },
  {
    key: 'encaminhamento',
    titulo: 'Recomendação de encaminhamento',
    ajuda: 'qual próxima tutoria? Por quê?',
    icone: 'send-to',
    formato: 'texto',
  },
  {
    key: 'pendencias',
    titulo: 'Pendências',
    ajuda: 'o que ficou incompleto',
    icone: 'square-dashed',
    formato: 'texto',
  },
  {
    key: 'observacoes',
    titulo: 'Observações adicionais',
    ajuda: '',
    icone: 'reorder',
    formato: 'texto',
  },
] as const;

export type HandsoffSecaoKey = (typeof HANDSOFF_SECOES)[number]['key'];

/**
 * Modelo novo da área de membros (entra em uso em janeiro de 2027).
 *
 * Cada mentorada tem a própria cópia das bases, penduradas na página dela em
 * "Área clientes". O caminho até elas é sempre o mesmo, e é por esses nomes que
 * o app desce a árvore: callout "Área de membros" → página "La Fortuna Academy
 * & …" (qualquer título) → callout "Área da mentorada" → base de cartões → "Gestão de resultados"
 * → um callout por seção, cada um com a base dentro.
 *
 * Renomear qualquer um desses títulos no modelo quebra a descoberta — trocar
 * aqui junto.
 */
export const AREA_DE_MEMBROS = {
  callout: 'Área de membros',
  calloutCartoes: 'Área da mentorada',
  calloutTarefas: 'Tarefas da mentoria',
  calloutPlanejamento: 'Planejamento estratégico',
  baseCenarios: 'Cenários',
  cartaoGestao: 'Gestão de resultados',
} as const;

/** Base "Tarefas" de cada mentorada, dentro do callout "Tarefas da mentoria". */
export const TAREFAS = {
  tarefa: 'Tarefa',
  prazo: 'Prazo',
  observacoes: 'Observações',
  /** Caixa de seleção: marcada = feita. */
  feita: 'Status',
} as const;

/** Base "Cenários": um cartão por ano com o cenário atual × desejado. */
export const CENARIOS = {
  titulo: 'Planejamento',
  ano: 'Ano',
} as const;

/** Ícone do modelo "Nova página" das tarefas no Notion: o lápis marrom nativo (não o emoji). */
export const TAREFAS_ICONE = { name: 'pencil', color: 'brown' } as const;

export type SecaoGestao = 'marcos' | 'ano' | 'meses' | 'trimestres';

/** Título do callout que guarda cada base, dentro da página Gestão de resultados. */
export const GESTAO_CALLOUTS: Record<SecaoGestao, string> = {
  marcos: 'Linha do tempo',
  ano: 'Por ano',
  meses: 'Visão mensal financeira',
  trimestres: 'Visão financeira trimestral',
};

export const GESTAO_MESES = {
  mes: 'Mês',
  categoria: 'Categoria',
  faturamento: 'Faturamento',
  resgate: 'Resgate',
  despesas: 'Despesas',
  investimento: 'Investimento',
  lucroSemInvestimento: 'Lucro s/ investimento',
  lucroComInvestimento: 'Lucro c/ investimento',
  caixa: 'Caixa do Mês',
  /** Fórmula = lucro c/ investimento ÷ faturamento — uma fração, não um número de 0 a 100. */
  percentualLucro: '% Lucro',
} as const;

export const GESTAO_TRIMESTRES = {
  trimestre: 'Trimestre',
  faturamento: 'Faturamento',
  despesas: 'Despesas',
  lucro: 'Lucro (R$)',
  /** Fração, como o % Lucro dos meses. */
  percentualLucro: 'Lucro',
} as const;

export const GESTAO_ANO = {
  ano: 'item',
  faturamento: 'Faturamento',
  despesas: 'Despesas',
  investimentos: 'Investimentos',
  lucro: 'Lucro (R$)',
  percentualLucro: 'Lucro',
} as const;

export const GESTAO_MARCOS = {
  titulo: 'Marco/conquista',
  data: 'Mes',
} as const;
