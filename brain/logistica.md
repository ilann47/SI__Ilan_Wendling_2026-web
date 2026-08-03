> Links: [[core]] · [[auth]] · [[compatibilidade-legada]] · [[unificacao-multitenant]] · [[paridade-api]] · [[pagamentos]]

# Logística

## Objetivo

Administrar transportadoras, veículos de frota e seus vínculos dentro da
organização ativa, preservando os cadastros e contratos históricos do Kaneko.

## Contexto

O backend V41 tornou `/api/transportadoras` tenant-aware e o V48 estendeu o
isolamento a `/api/veiculos-frota` e `/api/transportadora-veiculos`, sem alterar
as URLs públicas. O frontend preserva as três telas, agora exigindo JWT
contextual, permissões por ação e cache isolado pela organização ativa.

## Fluxo (camadas da arquitetura)

```text
rota /app/transportadoras -> PermissionRoute logistics:read -> CrudResourcePage
  -> transportadorasConfig tenant-aware -> React Query [tenant, organizationId, ...]
  -> /api/transportadoras -> organização resolvida pelo JWT contextual

rota /app/veiculos-frota -> PermissionRoute logistics:read -> CrudResourcePage
  -> veiculosFrotaConfig tenant-aware -> /api/veiculos-frota

rota /app/transportadora-veiculos -> PermissionRoute logistics:read -> CrudResourcePage
  -> referências tenant-aware de transportadora e veículo
  -> /api/transportadora-veiculos
```

## Endpoints (se houver)

| Método | Contrato | Permissão |
|---|---|---|
| GET | `/api/transportadoras` e `/{id}` | `logistics:read` |
| POST | `/api/transportadoras` | `logistics:manage` |
| PUT | `/api/transportadoras/{id}` | `logistics:manage` |
| DELETE | `/api/transportadoras/{id}` | `logistics:manage` |
| GET | `/api/veiculos-frota` e `/{id}` | `logistics:read` |
| POST | `/api/veiculos-frota` | `logistics:manage` |
| PUT | `/api/veiculos-frota/{id}` | `logistics:manage` |
| DELETE | `/api/veiculos-frota/{id}` | `logistics:manage` |
| GET | `/api/transportadora-veiculos` e `/{id}` | `logistics:read` |
| POST | `/api/transportadora-veiculos` | `logistics:manage` |
| PUT | `/api/transportadora-veiculos/{id}` | `logistics:manage` |
| DELETE | `/api/transportadora-veiculos/{id}` | `logistics:manage` |

A organização não é enviada por header, query ou payload. URLs, payloads e
respostas permanecem compatíveis com a tela anterior.

## Estrutura de Dados (DTOs, Entidades)

`transportadorasConfig` conserva razão social, nome fantasia, tipo de pessoa,
documentos, contatos, endereço, cidade, condição de pagamento, atividade e
observação. `veiculosFrotaConfig` conserva placa, modelo, marca, ano, capacidade,
observação e o estado booleano `ativo`. O vínculo envia somente
`transportadoraId` e `veiculoFrotaId`; seu `ativo` permanece apenas na resposta e
na coluna existente. Nenhum formulário recebe campo `organizationId` ou `status`.

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

- As rotas `/app/transportadoras`, `/app/veiculos-frota` e
  `/app/transportadora-veiculos` foram preservadas.
- Navegação, rota e leitura exigem `logistics:read`.
- Criar, editar e excluir exigem `logistics:manage`.
- Listagens e referências usam chaves React Query iniciadas por
  `['tenant', organizationId]`.
- As duas referências do vínculo usam cache tenant-aware e exigem
  `logistics:manage` para cadastro rápido.
- Não foi criada transição de reativação nem campo `status` para o vínculo.

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
| 2026-08-03 | Adapta Veículos de Frota e vínculo Transportadora–Veículo ao contrato V48. |
