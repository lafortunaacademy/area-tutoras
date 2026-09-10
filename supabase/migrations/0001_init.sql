-- =====================================================================
-- Área das tutoras — La Fortuna Academy
--
-- Este banco NÃO guarda conteúdo. O Notion é a fonte de verdade e é
-- consultado ao vivo a cada carregamento de página. Aqui ficam apenas:
--   1. o vínculo login (e-mail) -> linha da tutora na base "Tutoras";
--   2. o cache dos IDs de database do Notion, porque descobri-los é caro.
-- =====================================================================

create table if not exists public.tutoras (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nome text not null,
  -- ID da página da tutora dentro da base "Tutoras" no Notion.
  -- É a chave de todo o isolamento: as bases (Briefings, Hands-off,
  -- Planejamento estratégico) são COMPARTILHADAS entre todas as tutoras,
  -- e o recorte de cada uma vem de um filtro por relation neste ID.
  notion_tutora_page_id text not null,
  ativa boolean not null default true,
  -- Marca as donas do negócio (Luíza / Fernanda), que podem listar as
  -- tutoras e usar o "ver como". A linha de uma tutora comum tem false.
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tutoras enable row level security;

-- Uma tutora logada lê só a própria linha, casada pelo e-mail do JWT.
create policy "tutoras leem a própria linha"
  on public.tutoras
  for select
  to authenticated
  using (email = (auth.jwt() ->> 'email'));

-- Nenhuma policy de insert/update/delete para `authenticated`: o cadastro
-- de tutoras acontece só via service-role key (scripts/add-tutora.mjs),
-- que nunca chega ao browser.

-- Cache dos IDs de database do Notion. Como as bases são compartilhadas
-- por todas as tutoras, este cache é global (não tem client_id): resolver
-- "Hands-off" uma vez serve para todo mundo.
create table if not exists public.notion_resolved_ids (
  section_key text primary key, -- 'tutoras' | 'area_das_tutoras' | 'mapas' | 'planejamento' | 'briefings' | 'handsoff'
  notion_id text not null,
  resolved_at timestamptz not null default now()
);

alter table public.notion_resolved_ids enable row level security;
-- Sem policies para `authenticated`: só é lido/escrito no servidor com a
-- service-role key. IDs de database não são segredo, mas também não têm
-- por que trafegar até o browser.
