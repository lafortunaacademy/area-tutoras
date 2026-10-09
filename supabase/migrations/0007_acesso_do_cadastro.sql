-- De onde veio cada acesso de mentorada.
--
-- 'cadastro': o e-mail vem da base "CRM clientes" do Notion e é sincronizado —
-- trocar lá troca aqui, e tirar lá tira aqui.
-- 'manual': liberado à mão no Administrativo; a sincronização nunca mexe nele.
alter table public.mentoradas_acesso
  add column if not exists origem text not null default 'manual'
  check (origem in ('manual', 'cadastro'));

create index if not exists mentoradas_acesso_origem on public.mentoradas_acesso (origem);
