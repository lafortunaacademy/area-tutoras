-- Materiais que a equipe preenche (ex.: "Tutoria terapêutica": a tutora registra
-- cada sessão e a mentorada lê), e dois tipos novos de pergunta:
--   links   — material complementar (PDF, Google Docs, Spotify…): { "links": ["https://…"] }
--   tarefas — mostra as Tarefas da mentoria (base do Notion); não guarda resposta
alter table public.tutoria_materiais
  add column if not exists quem_preenche text not null default 'mentorada'
  check (quem_preenche in ('mentorada', 'equipe'));

alter table public.tutoria_perguntas drop constraint if exists tutoria_perguntas_tipo_check;
alter table public.tutoria_perguntas
  add constraint tutoria_perguntas_tipo_check check (tipo in ('texto', 'opcoes', 'arquivo', 'aviso', 'links', 'tarefas'));
