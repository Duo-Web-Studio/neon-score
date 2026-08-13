# Corrigir erro ao criar nova conta

## Causa confirmada

A tabela `auth.users` tem **dois gatilhos idênticos** apontando para a mesma função `handle_new_user`:

- `on_auth_user_created`
- `trg_auth_users_handle_new_user`

Ou seja, a função roda **duas vezes** em cada cadastro. Ela faz `INSERT INTO public.profiles (id, ...)` sem tratamento de conflito, e `profiles.id` é chave primária. Na segunda execução o insert viola a chave primária (`profiles_pkey`), o erro estoura dentro do gatilho e o Supabase Auth aborta o cadastro inteiro, retornando ao formulário um erro genérico de banco ("Database error saving new user").

Isso explica por que nenhuma conta nova consegue ser criada, mesmo com e-mail e senha válidos.

## Correção

Uma migration de banco com duas partes:

1. **Remover o gatilho duplicado** — apagar `trg_auth_users_handle_new_user`, mantendo apenas `on_auth_user_created`.
2. **Tornar a função idempotente** — recriar `handle_new_user` com `ON CONFLICT (id) DO NOTHING` no insert em `profiles`, para que uma eventual execução dupla no futuro nunca mais quebre o cadastro. A parte de `user_roles` já tem `ON CONFLICT DO NOTHING` e permanece igual.

Nenhuma mudança de esquema, política RLS ou código de frontend é necessária — o formulário de cadastro em `src/pages/Auth.tsx` e o `signUp` em `src/hooks/useAuth.tsx` já estão corretos.

## Verificação

Após a migration, executar um cadastro real de teste no preview e confirmar:

- a conta é criada sem erro;
- existe exatamente uma linha em `profiles` com `status = 'pending'`;
- os cargos escolhidos (SDR/Closer) aparecem uma vez cada em `user_roles`;
- a tela de "Aguardando aprovação" é exibida corretamente.

## Observação (fora do escopo)

O mesmo padrão de gatilhos duplicados existe em outras tabelas (`deals`, `goals`, `commission_rates`) — lá as funções são de recálculo/timestamp e rodar duas vezes não gera erro, apenas trabalho repetido. Posso limpar isso depois, em uma tarefa separada, se você quiser.
