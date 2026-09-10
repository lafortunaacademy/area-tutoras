# Área das tutoras — La Fortuna Academy

App web da área de membros das tutoras. **O Notion é a fonte de verdade**: toda
página busca os dados ao vivo a cada carregamento. Uma edição feita no Notion
aparece no app no próximo refresh — não existe "publicar".

## O que fica salvo no banco do app

Praticamente nada. Só duas coisas, ambas em `supabase/migrations/0001_init.sql`:

| tabela | o que guarda |
| --- | --- |
| `tutoras` | e-mail de login → ID da página da tutora na base **Tutoras** do Notion |
| `notion_resolved_ids` | os IDs das databases do Notion (descobrir é caro; o conteúdo, nunca) |

Nenhum conteúdo do Notion — nem mentorada, nem briefing, nem hands-off — é
copiado para cá.

## O que o Notion tem hoje (conferido em 2026-09-10)

| base | ligação com a tutora | ligação com a mentorada |
| --- | --- | --- |
| Área das tutoras | **não existe** | é a própria linha |
| Planejamento estratégico | `Área de tutora` — **rollup**, não filtrável | `Área da mentorada` — relation ✅ |
| Briefings | `Para a tutora:` — relation ✅ | **não existe** |
| Hands-off | `Feito pela tutora:` — relation ✅ | `Mentorada` — relation ✅ |

Duas consequências que o código não tem como contornar sozinho:

1. **A carteira sai só do Hands-off.** Como é a única base com relation nas duas
   pontas, a carteira de uma tutora é o conjunto de mentoradas com quem ela já
   registrou uma sessão. Uma mentorada recém-atribuída, antes do primeiro
   hands-off, não aparece.
2. **Briefing não é recortável por mentorada.** Ele sabe para qual tutora é, não
   sobre quem. Por isso vive em `/painel/briefings` e não na página da mentorada.

**A correção é uma propriedade só:** criar em *Área das tutoras* uma relation
`Tutora` apontando para a base *Tutoras*. O código já tenta esse caminho
primeiro — no minuto em que a propriedade existir, a carteira passa a sair dali
e o furo do item 1 fecha sozinho. Para o item 2, seria uma relation
`Área da mentorada` em *Briefings*.

## Isolamento entre tutoras

Diferente de um portal em que cada cliente tem a própria árvore de páginas,
aqui as bases do Notion são **compartilhadas**. O recorte de cada tutora existe
só como relation (`Para a tutora:`, `Feito pela tutora:`, `Área de tutora`).

Isso muda o desenho da segurança: não existe "consulta da tutora", existe
consulta **filtrada** — e um filtro esquecido vazaria a base inteira. Por isso:

- `src/lib/notion/carteira.ts` é a única fonte da lista de mentoradas que uma
  tutora pode ver. Toda página de mentorada entra por `exigirMentorada()`, que
  devolve **404** para um ID fora da carteira — a mesma resposta de um ID
  inexistente, para não confirmar a existência da mentorada de outra tutora.
- Toda consulta em `src/lib/notion/mentorada.ts` leva **os dois** IDs no filtro
  (mentorada *e* tutora), mesmo depois de a carteira já ter autorizado.
- A rota de conteúdo sob demanda refaz a autorização do zero e só lê uma página
  que esteja na lista que o próprio servidor montou.

## Modo admin / "ver como"

A flag `is_admin` na linha da própria pessoa libera `/admin`, que lista as
tutoras com um botão **Ver como**. O botão grava um cookie `httpOnly` com o ID
assinado por HMAC — mas a assinatura sozinha não autoriza nada: a cada
requisição, `getSessao()` reconfere no banco que quem está logada continua
sendo admin. Perder o admin derruba o preview na hora.

## Escrita de volta no Notion

O app escreve em um lugar só: **Hands-off**. A tutora preenche o formulário e o
app cria a página na base, no mesmo formato de sempre (um heading por seção,
bullets onde o Notion usa bullets).

Isso é uma **Server Action** (`hands-off/actions.ts`) — mutação de verdade, que
justifica a re-renderização que o Next faz.

Já o "expandi um card, me traz o conteúdo de dentro" é uma **Route Handler**
GET (`/api/notion-content/[pageId]`), *não* uma Server Action: Server Action
chamada de Client Component re-renderiza a rota inteira a cada chamada, o que é
desperdício puro para leitura.

## Performance

Listagem nunca pré-carrega conteúdo pesado. A página da mentorada busca só as
*linhas* de cada base; os blocos de um item só são lidos quando a tutora abre
aquele item — e só uma vez por item.

## Robustez com a API do Notion

- **Visualização vinculada (linked view):** quando uma base aparece na página
  como view linkada, a API não resolve o database por trás dela. O resolver
  tenta primeiro `search` por título (que enxerga a base de verdade), depois
  varre a árvore, e a saída final é fixar o ID em `NOTION_DB_*` no `.env.local`.
- **Fórmula e rollup:** a mesma propriedade volta como número (`1000`), como
  texto já formatado (`"R$ 1.000,00"`) ou como array. Os três caminhos caem em
  `src/lib/notion/props.ts`.
- **429 e 5xx:** o client tenta de novo com backoff, respeitando `retry-after`.

## Colocar para rodar

```bash
cp .env.local.example .env.local   # preencher
npm run notion:doctor              # confere os nomes contra o Notion real
npm run dev
```

1. **Supabase** — criar o projeto, rodar `supabase/migrations/0001_init.sql`,
   copiar URL + anon key + service_role para o `.env.local`. Em
   Authentication > URL Configuration, adicionar `/auth/callback` às redirect
   URLs.
2. **Notion** — a integração precisa ser criada **no workspace da La Fortuna
   Academy** (não no seu), e a página *Área das tutoras* precisa ser
   compartilhada com ela.
3. **Cadastrar as tutoras:**

```bash
npm run tutora:add -- --email ana@exemplo.com --nome "Ana Souza" --notion <page-id-dela-na-base-Tutoras>
```

Sua própria linha leva `--admin`.

## Onde mexer quando algo mudar no Notion

`src/lib/notion/config.ts` é o único arquivo que conhece nomes de bases e de
propriedades. Renomeou algo no Notion? Muda ali, e mais em lugar nenhum.
`npm run notion:doctor` aponta o que está divergindo.
