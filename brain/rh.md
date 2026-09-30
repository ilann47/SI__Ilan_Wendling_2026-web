> Links: [[core]] · [[auth]] · [[compatibilidade-legada]] · [[unificacao-multitenant]] · [[paridade-api]]

# Recursos Humanos

## Objetivo

Administrar cargos e funcionários da organização ativa, preservando as telas e
os contratos históricos do Kaneko.

## Contexto

O backend V43 tornou `/api/cargos` tenant-aware e a história seguinte aplicou o
mesmo isolamento a `/api/funcionarios`, sem alterar as URLs públicas. O frontend
mantém `/app/cargos` e `/app/funcionarios`, exigindo JWT contextual, permissões
por ação e cache isolado pela organização ativa.

## Fluxo (camadas da arquitetura)

```text
rota /app/cargos -> PermissionRoute workforce:read -> CrudResourcePage
  -> cargosConfig tenant-aware -> React Query [tenant, organizationId, ...]
  -> /api/cargos -> organização resolvida pelo JWT contextual

rota /app/funcionarios -> PermissionRoute workforce:read -> CrudResourcePage
  -> funcionariosConfig tenant-aware -> React Query [tenant, organizationId, ...]
  -> /api/funcionarios -> organização resolvida pelo JWT contextual
```

## Endpoints (se houver)

| Método | Contrato | Permissão |
|---|---|---|
| GET | `/api/cargos` e `/{id}` | `workforce:read` |
| POST | `/api/cargos` | `workforce:manage` |
| PUT | `/api/cargos/{id}` | `workforce:manage` |
| DELETE | `/api/cargos/{id}` | `workforce:manage` |
| GET | `/api/funcionarios` e `/{id}` | `workforce:read` |
| POST | `/api/funcionarios` | `workforce:manage` |
| PUT | `/api/funcionarios/{id}` | `workforce:manage` |
| DELETE | `/api/funcionarios/{id}` | `workforce:manage` |

A organização não é enviada por header, query ou payload. URLs, payloads e
respostas permanecem compatíveis com a tela anterior.

## Estrutura de Dados (DTOs, Entidades)

`cargosConfig` conserva nome, descrição, salário-base, carga horária, exigência
de CNH e atividade. `funcionariosConfig` conserva identificação, documentos,
contatos, endereço, Cargo, CNH, admissão, demissão, salário, observação e o estado
booleano `ativo` retornado pela API. Não foi inventado campo `status`. Os
formulários não recebem nem enviam `organizationId` ou variantes; o tenant vem
somente do JWT contextual.

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

- As rotas `/app/cargos` e `/app/funcionarios` e suas telas CRUD foram preservadas.
- Navegação, rota e leitura exigem `workforce:read`.
- Criar, editar e excluir exigem `workforce:manage`.
- Listagens e referências usam chaves React Query iniciadas por
  `['tenant', organizationId]`.
- Cargo continua obrigatório no formulário de Funcionário e usa a referência
  tenant-aware `/api/cargos`.
- `usuariosConfig` não foi alterado.

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
| 2026-08-03 | Adapta Funcionários ao contexto multiempresa preservando estado e payload reais. |
