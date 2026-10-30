-- A foto de quem é do time e não tem página na base Tutoras do Notion.
--
-- Quem é tutora já tem foto lá, e é de lá que ela vem: esta coluna é só para
-- quem administra e não dá tutoria. Guarda a imagem inteira, já reduzida a um
-- quadrado pequeno em webp (uns 10 KB), para não depender de um bucket de
-- arquivos só por causa de meia dúzia de retratos.
alter table public.tutoras
  add column if not exists foto text;

comment on column public.tutoras.foto is
  'Retrato em data URL (webp, 192px). Só para quem não tem notion_tutora_page_id.';
