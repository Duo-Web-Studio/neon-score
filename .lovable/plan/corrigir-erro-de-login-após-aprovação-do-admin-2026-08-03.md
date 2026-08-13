# Corrigir erro de login após aprovação do admin

## O que está acontecendo

Os logs de autenticação mostram que as tentativas de login falham com o erro `email_not_confirmed` (HTTP 400). A conta é criada, aparece no painel do admin e o admin aprova — mas o Supabase Auth continua bloqueando o login porque o usuário nunca clicou no link de confirmação enviado por e-mail.

Ou seja: hoje existem **duas** barreiras para entrar (confirmação por e-mail + aprovação do admin), e a plataforma foi pensada para que a aprovação do admin seja a barreira real.

## Correção proposta

1. **Ativar a confirmação automática de e-mail** nas configurações de autenticação. O cadastro passa a criar a conta já confirmada; quem controla o acesso é o admin, pela aprovação no painel (status `pending` → `approved`), que já funciona.
2. **Confirmar as contas já existentes** que estão travadas nesse estado, para que consigam entrar sem precisar recadastrar.
3. **Ajustar as mensagens da tela de cadastro** (`src/pages/Auth.tsx`): remover "Verifique seu e-mail para confirmar sua conta" e deixar apenas a informação de que um administrador precisa liberar o acesso.
4. **Melhorar a mensagem de erro no login**: quando o retorno for de e-mail não confirmado ou credenciais inválidas, exibir texto em português claro em vez do erro cru do servidor.

## Detalhes técnicos

- `configure_auth` com `auto_confirm_email: true` (mantendo `password_hibp_enabled` ativo e cadastros abertos).
- Atualização de dados em `auth.users` para preencher `email_confirmed_at` das contas pendentes de confirmação.
- Tradução de mensagens de erro no `signIn` (`src/hooks/useAuth.tsx`) ou no handler do `src/pages/Auth.tsx`.
- Nenhuma mudança de schema, RLS ou fluxo de aprovação do admin.

## Efeito colateral a considerar

Sem confirmação de e-mail, ninguém valida se o endereço informado é real. Como todo acesso ainda depende da aprovação manual do admin, o risco é baixo — e a recuperação de senha continua funcionando normalmente.
