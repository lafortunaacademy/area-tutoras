-- Acesso das mentoradas à área de membros.
--
-- A tabela diz quem PODE entrar e qual página do Notion é dela. O conteúdo
-- continua só no Notion: aqui ficam e-mail, nome e o ID da página.
create table if not exists public.mentoradas_acesso (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nome text not null,
  -- ID da linha dela em "Área clientes" (a própria página da cliente).
  notion_page_id text not null,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.mentoradas_acesso enable row level security;

-- Cada mentorada lê só a própria linha, casada pelo e-mail do JWT.
create policy "mentoradas leem a própria linha"
  on public.mentoradas_acesso
  for select
  to authenticated
  using (email = (auth.jwt() ->> 'email'));

-- Sem insert/update/delete para `authenticated`: o cadastro acontece só com a
-- service-role key (scripts/add-mentorada.mjs), que nunca chega ao browser.
