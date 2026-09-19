-- Tipo "tabela" de pergunta (ex.: a Carteira de investimentos). As colunas vão
-- em `opcoes`; a resposta é { "linhas": [["XP", "Renda fixa", …], …] }.
--
-- A trava de tipos sai do banco: quem confere o tipo de cada pergunta é o app,
-- ao gravar. Assim um tipo novo não pede outro SQL.
alter table public.tutoria_perguntas drop constraint if exists tutoria_perguntas_tipo_check;
