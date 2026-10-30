# Publicar

O app é Next.js; a Vercel reconhece sozinha. O que exige atenção são as
variáveis e os endereços de retorno do login.

## 1. Repositório

O código já está versionado aqui. Crie um repositório **privado** no GitHub
(sem README) e:

```bash
git remote add origin git@github.com:<voce>/area-tutoras.git
git push -u origin main
```

## 2. Vercel

[vercel.com/new](https://vercel.com/new) → importar o repositório → Deploy.

## 3. Variáveis de ambiente

Em Settings > Environment Variables. Para listar os valores atuais:

```bash
npm run deploy:env
```

Cole cada par. `NEXT_PUBLIC_SITE_URL` é a única que muda: passa a ser o
endereço da Vercel.

⚠️ `SUPABASE_SERVICE_ROLE_KEY` e `NOTION_TOKEN` ignoram RLS e leem o Notion da
cliente. Só existem no servidor — nunca com prefixo `NEXT_PUBLIC_`.

## 4. Supabase

Authentication > URL Configuration:

- **Site URL**: `https://<app>.vercel.app`
- **Redirect URLs**: `https://<app>.vercel.app/auth/callback`

Manter também o `http://localhost:3000/auth/callback` enquanto houver
desenvolvimento local.

## 5. SMTP próprio — obrigatório

O SMTP embutido do Supabase libera ~3 e-mails por hora. Com ele, as tutoras não
conseguem entrar. Authentication > Emails > SMTP Settings; [Resend](https://resend.com)
tem plano grátis.

## Antes de abrir para as tutoras

- **Trocar o token do Notion.** O atual passou por conversa; gere outro em
  notion.so/profile/integrations e atualize nos dois lugares (`.env.local` e
  Vercel).
- **Estreitar a conexão do Notion.** A integração enxerga o workspace inteiro da
  Fernanda. O certo é conectá-la só nas bases que o app usa.
- **Conferir o `PREVIEW_COOKIE_SECRET`** — ele assina o cookie do "ver como". Em
  produção, use um valor diferente do local: `openssl rand -hex 32`.

## App de celular (la-fortuna-app)

O app das mentoradas abre este site; o que é dele aqui:

1. **Banco:** rodar `supabase/migrations/0009_app_celular.sql` (celulares, avisos,
   exclusões de conta).
2. **E-mail de acesso:** colar de novo `supabase/emails/magic-link.html` no
   Supabase. Ele agora traz o código de 6 dígitos (`{{ .Token }}`), que é como a
   mentorada entra pelo app. Em Authentication > Providers > Email, deixar o
   tamanho do código em 6.
3. **Variáveis** (as do push só existem depois das contas Apple e Firebase;
   sem elas o site funciona igual, só aquela plataforma não recebe):
   - `CRON_SECRET`: `openssl rand -hex 32`; protege o lembrete diário.
   - iPhone, chave .p8 de developer.apple.com > Keys (Apple Push Notifications
     service): `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY` (o conteúdo do .p8) e
     `APNS_BUNDLE_ID=com.lafortunaacademy.app`. `APNS_AMBIENTE=desenvolvimento`
     só para build rodando direto pelo Xcode; TestFlight e loja usam produção.
   - Android: `FCM_CONTA_DE_SERVICO`, o JSON inteiro da conta de serviço
     (Firebase > Configurações do projeto > Contas de serviço > Gerar chave).
4. **Lembrete de sessão:** `vercel.json` agenda `/api/cron/lembretes` todo dia às
   8h (11h UTC), avisando das sessões de hoje e de amanhã. No plano Pro da Vercel
   dá para rodar de hora em hora e avisar mais perto da sessão.
5. **Lojas:** a política de privacidade é `/privacidade` e a exclusão de conta é
   `/conta/excluir`. Conferir em `src/app/privacidade/page.tsx` o nome da
   empresa e o e-mail de contato antes de publicar.
