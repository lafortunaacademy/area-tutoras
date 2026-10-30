-- O app de celular das mentoradas (projeto la-fortuna-app, Capacitor).
--
-- Tudo aqui é lido e escrito só no servidor, com a service-role key: RLS
-- ligado e sem policies, como nas tabelas das tutorias.

-- Um celular que aceitou notificações. O token muda (reinstalação, outro
-- aparelho), então a chave é o token, não a mentorada: ela pode ter vários.
create table if not exists public.dispositivos (
  token text primary key,
  -- ID da página dela em "Área clientes", com hífens (normalizarId).
  mentorada_id text not null,
  plataforma text not null check (plataforma in ('ios', 'android')),
  criado_em timestamptz not null default now(),
  visto_em timestamptz not null default now()
);

create index if not exists dispositivos_mentorada on public.dispositivos (mentorada_id);
alter table public.dispositivos enable row level security;

-- Trava contra notificação repetida: o lembrete roda todo dia e cada sessão
-- só pode avisar uma vez por momento ("sessao:<id>:2026-11-03:amanha").
create table if not exists public.push_enviados (
  chave text primary key,
  enviado_em timestamptz not null default now()
);

alter table public.push_enviados enable row level security;

-- Avisos do administrativo, para o histórico na tela de avisos.
create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensagem text not null,
  -- null = todas as mentoradas; senão, o ID da página de uma.
  mentorada_id text,
  enviado_por text not null,
  celulares int not null default 0,
  enviado_em timestamptz not null default now()
);

alter table public.avisos enable row level security;

-- Exclusão de conta pedida pela própria mentorada (exigência das lojas). O
-- acesso é desligado na hora; o que está no Notion é da mentoria e fica a
-- cargo do administrativo, que vê o pedido aqui.
alter table public.mentoradas_acesso add column if not exists excluida_em timestamptz;

create table if not exists public.exclusoes_de_conta (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nome text not null,
  mentorada_id text not null,
  pedido_em timestamptz not null default now()
);

alter table public.exclusoes_de_conta enable row level security;
