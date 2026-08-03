> Links: [[core]] · [[auth]] · [[compatibilidade-legada]] · [[unificacao-multitenant]] · [[paridade-api]] · [[pagamentos]]

# Logística

## Objetivo

Administrar transportadoras da organização ativa preservando o cadastro e os
contratos históricos do Kaneko.

## Contexto

O backend V41 tornou `/api/transportadoras` tenant-aware sem alterar sua URL. O
frontend mantém `/app/transportadoras` e o formulário existente, agora exigindo
JWT contextual, permissões por ação e cache isolado pela organização ativa.
Veículos de Frota e o vínculo N:N Transportadora–Veículo não fazem parte desta
fatia e continuam com o comportamento legado.

## Fluxo (camadas da arquitetura)

```text
rota /app/transportadoras -> PermissionRoute logistics:read -> CrudResourcePage
  -> transportadorasConfig tenant-aware -> React Query [tenant, organizationId, ...]
  -> /api/transportadoras -> organização resolvida pelo JWT contextual
```

## Endpoints (se houver)

| Método | Contrato | Permissão |
|---|---|---|
| GET | `/api/transportadoras` e `/{id}` | `logistics:read` |
| POST | `/api/transportadoras` | `logistics:manage` |
| PUT | `/api/transportadoras/{id}` | `logistics:manage` |
| DELETE | `/api/transportadoras/{id}` | `logistics:manage` |

A organização não é enviada por header, query ou payload. URLs, payloads e
respostas permanecem compatíveis com a tela anterior.

## Estrutura de Dados (DTOs, Entidades)

`transportadorasConfig` conserva razão social, nome fantasia, tipo de pessoa,
documentos, contatos, endereço, cidade, condição de pagamento, atividade e
observação. O formulário não recebe campo `organizationId`.

## Integrações externas (se houver)

Não há integração externa nesta fatia. A condição de pagamento referenciada já
usa o catálogo tenant-aware V38 descrito em [[pagamentos]].

## Tratamento de Erros

O cliente central converte Problem Details. Contexto inválido retorna `401`,
falta de `logistics:read` ou `logistics:manage` retorna `403`, recurso ausente ou
de outra organização retorna `404` e conflitos de integridade permanecem `409`.

## Testes (curl ou equivalente)

- `npm test -- --run src/components/crud/resourceConfig.test.ts src/layout/navigation.test.tsx src/App.test.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Decisões Técnicas

- A rota `/app/transportadoras` e a tela CRUD genérica foram preservadas.
- Navegação, rota e leitura exigem `logistics:read`.
- Criar, editar e excluir exigem `logistics:manage`.
- Listagens e referências usam chaves React Query iniciadas por
  `['tenant', organizationId]`.
- `veiculosFrotaConfig` e `transportadoraVeiculosConfig` não foram alterados.

## Módulos relacionados

- [[core]]
- [[auth]]
- [[compatibilidade-legada]]
- [[unificacao-multitenant]]
- [[paridade-api]]
- [[pagamentos]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-08-03 | Adapta exclusivamente Transportadoras ao contrato multiempresa V41. |
