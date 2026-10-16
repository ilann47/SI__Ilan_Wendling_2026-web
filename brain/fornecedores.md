> Links: [[core]] · [[auth]] · [[compatibilidade-legada]] · [[unificacao-multitenant]] · [[paridade-api]] · [[pagamentos]] · [[logistica]]

# Fornecedores

## Objetivo

Administrar fornecedores da organização ativa preservando o cadastro histórico,
seus contatos e suas referências comerciais e logísticas.

## Contexto

O backend V42 tornou `/api/fornecedores` tenant-aware sem alterar a URL pública.
O frontend mantém `/app/fornecedores` e o formulário existente, agora exigindo
JWT contextual, permissões por ação e cache isolado pela organização ativa.
Produto–Fornecedor, notas e financeiro permanecem fora desta fatia.

## Fluxo (camadas da arquitetura)

```text
rota /app/fornecedores -> PermissionRoute suppliers:read -> CrudResourcePage
  -> fornecedoresConfig tenant-aware -> React Query [tenant, organizationId, ...]
  -> /api/fornecedores -> organização resolvida pelo JWT contextual
```

Nos documentos de compra, `ReferenceSelect` e `QuickCreateProvider` permitem
pesquisar ou cadastrar o fornecedor sem sair do formulário original. O cadastro
usa os campos reais de `fornecedoresConfig`; a resposta salva é selecionada sem
redigitar identificadores e sem perder os produtos já informados.

## Endpoints (se houver)

| Método | Contrato | Permissão |
|---|---|---|
| GET | `/api/fornecedores` e `/{id}` | `suppliers:read` |
| POST | `/api/fornecedores` | `suppliers:manage` |
| PUT | `/api/fornecedores/{id}` | `suppliers:manage` |
| DELETE | `/api/fornecedores/{id}` | `suppliers:manage` |

A organização não é enviada por header, query ou payload. URLs, payloads e
respostas permanecem compatíveis com a tela anterior.

## Estrutura de Dados (DTOs, Entidades)

`fornecedoresConfig` conserva identificação, documentos, endereço, limite de
crédito, atividade e observação. E-mails e telefones continuam subitens do mesmo
formulário. Condição de pagamento e transportadora permanecem referências aos
catálogos tenant-aware já existentes. O formulário não recebe `organizationId`.

## Integrações externas (se houver)

Não há integração externa nesta fatia. As referências internas apontam para
[[pagamentos]] e [[logistica]].

## Tratamento de Erros

O cliente central converte Problem Details. Contexto inválido retorna `401`,
falta de `suppliers:read` ou `suppliers:manage` retorna `403`, recurso ausente ou
de outra organização retorna `404` e conflitos de integridade permanecem `409`.

Uma falha no seletor é mostrada como erro com nova tentativa, não como ausência
de fornecedores. O cadastro contextual mantém os valores quando o servidor
recusa o envio. Cancelar não altera o documento original. Uma troca de empresa
ou revogação de permissão descarta o contexto do diálogo, não os dados do banco.

## Testes (curl ou equivalente)

- `npm test -- --run src/components/crud/resourceConfig.test.ts src/layout/navigation.test.tsx src/App.test.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm test -- --run src/context/QuickCreateContext.test.tsx src/components/form/ReferenceSelect.test.tsx`

## Decisões Técnicas

- A rota `/app/fornecedores` e a tela CRUD genérica foram preservadas.
- Navegação, rota e leitura exigem `suppliers:read`.
- Criar, editar e excluir exigem `suppliers:manage`.
- Listagens e referências usam chaves React Query iniciadas por
  `['tenant', organizationId]`.
- `produtoFornecedoresConfig`, notas e recursos financeiros não foram alterados.
- A criação contextual exige `suppliers:manage`; consulta exige
  `suppliers:read`. O provider também verifica a permissão antes de abrir e
  enviar. A resposta de uma empresa anterior não é selecionada após trocar o
  contexto. Envio pendente não é repetido por clique duplo.

## Módulos relacionados

- [[core]]
- [[auth]]
- [[compatibilidade-legada]]
- [[unificacao-multitenant]]
- [[paridade-api]]
- [[pagamentos]]
- [[logistica]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-08-03 | Adapta exclusivamente Fornecedores ao contrato multiempresa V42. |
| 2026-09-12 | Valida cadastro contextual real, cancelamento e erro sem perder itens, seleção automática do cadastro salvo, RBAC e isolamento por organização. |
