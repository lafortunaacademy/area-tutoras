-- Um formulário das tutorias pode ser respondido mais de uma vez (uma
-- pré-sessão por sessão). Cada preenchimento é um "envio"; as respostas
-- pertencem ao envio. O app mostra o último enviado e guarda os anteriores.
--
-- Só pode haver um envio em aberto (rascunho) por mentorada e formulário.

create table if not exists public.tutoria_envios (
  id uuid primary key default gen_random_uuid(),
  mentorada_id text not null,
  material_id uuid not null references public.tutoria_materiais(id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  enviado_em timestamptz,
  criado_por text
);

create index if not exists tutoria_envios_mentorada on public.tutoria_envios (mentorada_id, material_id);
create unique index if not exists tutoria_envios_um_rascunho
  on public.tutoria_envios (mentorada_id, material_id)
  where enviado_em is null;

alter table public.tutoria_envios enable row level security;

-- As respostas passam a pertencer a um envio. As que existiam eram só de teste.
delete from public.tutoria_respostas;
alter table public.tutoria_respostas
  add column if not exists envio_id uuid not null references public.tutoria_envios(id) on delete cascade;
alter table public.tutoria_respostas drop constraint if exists tutoria_respostas_mentorada_id_pergunta_id_key;
alter table public.tutoria_respostas add constraint tutoria_respostas_envio_pergunta unique (envio_id, pergunta_id);
