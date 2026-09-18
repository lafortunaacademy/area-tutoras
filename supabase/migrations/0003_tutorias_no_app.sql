-- Tutorias dentro do próprio app (não espelham mais o Notion).
--
-- Modelo único para todas as mentoradas: pilares > tutorias > materiais >
-- perguntas. Cada mentorada tem as próprias respostas. Tudo é lido e escrito
-- só no servidor, com a service-role key; por isso RLS ligado e sem policies.

create table if not exists public.tutoria_pilares (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- A frase do pilar em pedaços: [{ "texto": "...", "negrito": true }, ...]
  frase jsonb not null default '[]'::jsonb,
  icone text,
  ordem int not null default 0
);

create table if not exists public.tutoria_tutorias (
  id uuid primary key default gen_random_uuid(),
  pilar_id uuid not null references public.tutoria_pilares(id) on delete cascade,
  nome text not null,
  icone text,
  ordem int not null default 0
);

-- Um material pode ser formulário, conteúdo (fase 2), grupo de outros
-- materiais, ou especial (fase 3: Temas & Roteiros, Teste de estilo).
create table if not exists public.tutoria_materiais (
  id uuid primary key default gen_random_uuid(),
  tutoria_id uuid not null references public.tutoria_tutorias(id) on delete cascade,
  pai_id uuid references public.tutoria_materiais(id) on delete cascade,
  nome text not null,
  icone text,
  tipo text not null check (tipo in ('formulario', 'conteudo', 'grupo', 'especial')),
  ordem int not null default 0
);

-- Perguntas de um formulário. `secao` é o título sob o qual ela aparece.
-- Tipos: texto (resposta escrita), opcoes (marcar uma ou mais), arquivo
-- (anexos), aviso (só texto para ler, sem resposta).
create table if not exists public.tutoria_perguntas (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.tutoria_materiais(id) on delete cascade,
  secao text,
  texto text not null,
  ajuda text,
  tipo text not null check (tipo in ('texto', 'opcoes', 'arquivo', 'aviso')),
  opcoes jsonb not null default '[]'::jsonb,
  ordem int not null default 0
);

-- Uma resposta por mentorada e pergunta. `mentorada_id` é o ID da página
-- dela em "Área clientes", no formato com hífens (normalizarId).
--   texto:   { "texto": "..." }
--   opcoes:  { "opcoes": ["Sim"] }
--   arquivo: { "arquivos": [{ "caminho": "...", "nome": "...", "tipo": "image/png" }] }
create table if not exists public.tutoria_respostas (
  id uuid primary key default gen_random_uuid(),
  mentorada_id text not null,
  pergunta_id uuid not null references public.tutoria_perguntas(id) on delete cascade,
  valor jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  atualizado_por text,
  unique (mentorada_id, pergunta_id)
);

create index if not exists tutoria_tutorias_pilar on public.tutoria_tutorias (pilar_id);
create index if not exists tutoria_materiais_tutoria on public.tutoria_materiais (tutoria_id);
create index if not exists tutoria_perguntas_material on public.tutoria_perguntas (material_id);
create index if not exists tutoria_respostas_mentorada on public.tutoria_respostas (mentorada_id);

alter table public.tutoria_pilares enable row level security;
alter table public.tutoria_tutorias enable row level security;
alter table public.tutoria_materiais enable row level security;
alter table public.tutoria_perguntas enable row level security;
alter table public.tutoria_respostas enable row level security;
