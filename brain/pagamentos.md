> Links: [[core]] · [[auth]] · [[compatibilidade-legada]] · [[unificacao-multitenant]] · [[paridade-api]]

# Catálogos de Pagamento

## Objetivo

Administrar, dentro da organização ativa, as formas e as condições de pagamento
que podem ser reutilizadas pelos fluxos financeiros e comerciais do Kaneko.

## Contexto

O backend V38 tornou os catálogos existentes tenant-aware sem trocar suas URLs.
O frontend preserva as telas genéricas anteriores, mas agora exige JWT contextual,
autoriza cada ação e separa o cache pela organização ativa.

## Fluxo (camadas da arquitetura)

```text
rota protegida -> PermissionRoute payments:read -> CrudResourcePage
  -> ResourceConfig tenant-aware -> React Query [tenant, organizationId, ...]
  -> /api/formas-pagamento ou /api/condicoes-pagamento
  -> organização resolvida exclusivamente pelo JWT contextual
```

## Endpoints (se houver)

| Método | Contrato | Permissão |
|---|---|---|
| GET | `/api/formas-pagamento` e `/{id}` | `payments:read` |
| POST | `/api/formas-pagamento` | `payments:manage` |
| PUT | `/api/formas-pagamento/{id}` | `payments:manage` |
| DELETE | `/api/formas-pagamento/{id}` | `payments:manage` |
| GET | `/api/condicoes-pagamento` e `/{id}` | `payments:read` |
| POST | `/api/condicoes-pagamento` | `payments:manage` |
| PUT | `/api/condicoes-pagamento/{id}` | `payments:manage` |
| DELETE | `/api/condicoes-pagamento/{id}` | `payments:manage` |

As URLs, payloads e respostas permanecem compatíveis com as telas legadas. O
frontend não envia `organizationId` em header, query ou corpo.

## Estrutura de Dados (DTOs, Entidades)

`formasPagamentoConfig` mantém nome e bandeira de atividade. A condição de
pagamento mantém nome, quantidade de parcelas, intervalo entre parcelas, forma
de pagamento referenciada e atividade. `ResourceConfig` declara se o recurso é
tenant-aware e as permissões de leitura, criação, atualização e exclusão.

## Integrações externas (se houver)

Não há integração com gateway nesta fatia. Os recursos são somente catálogos
administrativos consumidos pelo backend existente.

## Tratamento de Erros

O cliente central trata Problem Details. Contexto inválido retorna `401`, falta
de `payments:read` ou `payments:manage` retorna `403`, recurso ausente ou de outra
organização retorna `404` e conflitos de integridade permanecem `409`.

## Testes (curl ou equivalente)

- `npm test -- --run src/components/crud/resourceConfig.test.ts src/layout/navigation.test.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Decisões Técnicas

- As rotas `/app/formas-pagamento` e `/app/condicoes-pagamento` foram preservadas.
- A navegação e a rota exigem `payments:read`.
- Criar, editar, excluir e cadastro rápido exigem `payments:manage`.
- Listagens, detalhes de referência e seletores usam chaves React Query iniciadas
  por `['tenant', organizationId]` para impedir cache cruzado entre organizações.
- Recursos legados ainda não migrados mantêm suas chaves e permissões anteriores.

## Módulos relacionados

- [[core]]
- [[auth]]
- [[compatibilidade-legada]]
- [[unificacao-multitenant]]
- [[paridade-api]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-08-03 | Adapta formas e condições de pagamento ao contrato multiempresa V38. |
