> Links: [[core]] · [[auth]] · [[compatibilidade-legada]] · [[unificacao-multitenant]] · [[paridade-api]]

# Recursos Humanos

## Objetivo

Administrar o catálogo de cargos da organização ativa, preservando a tela e o
contrato histórico do Kaneko.

## Contexto

O backend V43 tornou `/api/cargos` tenant-aware sem alterar sua URL pública. O
frontend mantém `/app/cargos` e o formulário existente, agora exigindo JWT
contextual, permissões por ação e cache isolado pela organização ativa.
Funcionários ainda não fazem parte desta fatia e permanecem no contrato legado.

## Fluxo (camadas da arquitetura)

```text
rota /app/cargos -> PermissionRoute workforce:read -> CrudResourcePage
  -> cargosConfig tenant-aware -> React Query [tenant, organizationId, ...]
  -> /api/cargos -> organização resolvida pelo JWT contextual
```

## Endpoints (se houver)

| Método | Contrato | Permissão |
|---|---|---|
| GET | `/api/cargos` e `/{id}` | `workforce:read` |
| POST | `/api/cargos` | `workforce:manage` |
| PUT | `/api/cargos/{id}` | `workforce:manage` |
| DELETE | `/api/cargos/{id}` | `workforce:manage` |

A organização não é enviada por header, query ou payload. URLs, payloads e
respostas permanecem compatíveis com a tela anterior.

## Estrutura de Dados (DTOs, Entidades)

`cargosConfig` conserva nome, descrição, salário-base, carga horária, exigência
de CNH e atividade. O formulário não recebe campo `organizationId`.

## Integrações externas (se houver)

Não há integração externa nesta fatia.

## Tratamento de Erros

O cliente central converte Problem Details. Contexto inválido retorna `401`,
falta de `workforce:read` ou `workforce:manage` retorna `403`, recurso ausente ou
de outra organização retorna `404` e conflitos de integridade permanecem `409`.

## Testes (curl ou equivalente)

- `npm test -- --run src/components/crud/resourceConfig.test.ts src/layout/navigation.test.tsx src/App.test.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Decisões Técnicas

- A rota `/app/cargos` e a tela CRUD genérica foram preservadas.
- Navegação, rota e leitura exigem `workforce:read`.
- Criar, editar e excluir exigem `workforce:manage`.
- Listagens e referências usam chaves React Query iniciadas por
  `['tenant', organizationId]`.
- `funcionariosConfig` e `usuariosConfig` não foram alterados.

## Módulos relacionados

- [[core]]
- [[auth]]
- [[compatibilidade-legada]]
- [[unificacao-multitenant]]
- [[paridade-api]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-08-03 | Adapta exclusivamente Cargos ao contrato multiempresa V43. |
