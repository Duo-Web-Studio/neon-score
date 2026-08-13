# Auditoria e limpeza técnica (conservadora)

Nenhuma mudança de design, texto, cor, layout ou regra de negócio. Só correção e limpeza, confirmada por leitura do código.

## O que a auditoria encontrou (verificado)

- **TypeScript: 0 erros** hoje (`tsconfig.app.json` compila limpo). Mas isso acontece com `strict: false`, `noImplicitAny: false` e `strictNullChecks: false` — os erros ficam escondidos, não ausentes.
- **Lint: 77 problemas** — 59 erros (todos `any` explícito, 3 `prefer-const`, 1 bloco `catch` vazio em `Pipeline.tsx`) e 18 warnings de dependências de hooks.
- **Warnings de hooks reais**, não cosméticos: `Index.tsx` tem 5 `useMemo` com dependências faltando/erradas (`inCurrentMonth`, `monthKey`, `weekKey`), `TV.tsx` e `Comissoes.tsx`/`AdminComissoes.tsx` têm `useMemo` que não recalculam quando o mês vira — exatamente a classe de bug de "não atualizou no dia 1º" já vista antes. `Metas.tsx` recria `allUserGoals` em todo render.
- **Arquivos órfãos** (nenhuma referência em nenhum outro arquivo): `src/components/NavLink.tsx`, `src/components/NextLogo.tsx`, `src/pages/AdminSections.tsx`, `src/pages/AdminPipelineStages.tsx` (as duas páginas foram absorvidas por `AdminOrganizacao.tsx`, as rotas antigas só redirecionam). `src/App.css` não é importado em lugar nenhum.
- **Lógica de mês/semana duplicada** em 10 arquivos (cálculo de início/fim de mês reescrito à mão em `TV`, `Clientes`, `Performance`, `Comissoes`, `AdminComissoes`, `useCommissionHistory`, `useMrrMetrics`, `Metas`), apesar de já existirem `useCurrentMonth` e `useCurrentWeek`.
- **Triggers duplicados no banco**: `deals` tem `deals_update_goals` e `trg_deals_recalc_goals` chamando a mesma função, e `deals_track_recovery` + `trg_deals_track_recovery` idem; `commission_rates` tem dois triggers de timestamp iguais. Cada write em `deals` executa o recálculo de metas duas vezes.
- **Componentes muito grandes**: `NewDealDialog` (792), `TV` (771), `Pipeline` (741), `Clientes` (689), `AdminOrganizacao` (623).
- **Segurança**: nenhum segredo hardcoded no frontend; só a chave publicável via env — correto.

## O que será feito

**1. Bugs de runtime / correção de causa raiz**
- Corrigir as dependências dos `useMemo` em `Index.tsx`, `TV.tsx`, `Comissoes.tsx`, `AdminComissoes.tsx` para que os recortes mensais recalculem de fato na virada do mês (usando as chaves de `useCurrentMonth`), sem mudar os números exibidos hoje.
- Estabilizar `allUserGoals` em `Metas.tsx` com `useMemo`, eliminando recálculo em cada render.
- Substituir o `catch {}` vazio de `Pipeline.tsx` por tratamento real (toast de erro no padrão já usado no arquivo) e garantir `finally` encerrando loading em fluxos assíncronos onde isso hoje depende do caminho felizes.

**2. Tipagem**
- Remover os `any` explícitos trocando por tipos derivados de `src/integrations/supabase/types.ts` (`Tables<'deals'>`, `Tables<'clients'>`, etc.) e por tipos de payload do Realtime. Sem `@ts-ignore`, sem `eslint-disable`.
- Corrigir os 3 `prefer-const`.
- Não vou ligar `strict`/`strictNullChecks` nesta passada: isso geraria centenas de erros novos e viraria reconstrução — fica como recomendação separada.

**3. Deduplicação (limitada e útil)**
- Criar `src/lib/dateRanges.ts` com os helpers de início/fim de mês e comparação de período, e passar os 10 arquivos a usá-lo em vez de reimplementar. Interface pública dos hooks existentes preservada.
- Unificar o padrão de subscription Realtime num helper pequeno, já que 8 arquivos repetem o mesmo `channel/postgres_changes/removeChannel` — inclui garantir cleanup em todos.

**4. Código morto**
- Remover `NavLink.tsx`, `NextLogo.tsx`, `AdminSections.tsx`, `AdminPipelineStages.tsx` e `App.css` após confirmar, arquivo por arquivo, que nada importa nem referencia (as rotas `/admin/secoes` e `/admin/pipeline` continuam funcionando como redirects para `AdminOrganizacao`).
- Remover imports e variáveis não usadas apontadas pelo lint.

**5. Banco (mínimo e reversível)**
- Uma migração que apenas remove os triggers duplicados de `deals` e `commission_rates`, mantendo uma cópia de cada. Nenhuma alteração de tabela, coluna, RLS ou política.

**6. Validação final**
- Compilação TypeScript limpa, lint sem erros, e conferência de que rotas, login, formulários de venda/meta/cliente e as telas TV/Metas/Comissões seguem renderizando com os mesmos valores.

## Fora do escopo desta passada

- Quebrar `NewDealDialog`, `TV`, `Pipeline`, `Clientes` em vários arquivos: alto risco de regressão visual e de comportamento. Posso fazer depois, um arquivo por vez, se você quiser.
- Ligar modo `strict` do TypeScript.
- Atualizar dependências (nenhuma está causando problema).
