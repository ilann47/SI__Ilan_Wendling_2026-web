> Links: [[core]] · [[auth]] · [[compatibilidade-legada]] · [[unificacao-multitenant]] · [[paridade-api]]

# Clientes

## Objetivo

Administrar clientes pessoas físicas ou jurídicas dentro da organização ativa,
preservando a tela e o contrato histórico do Kaneko.

## Contexto

O backend V40 tornou `/api/clientes` tenant-aware sem alterar a URL pública. O
frontend mantém `/app/clientes` e o formulário existentes, mas passa a exigir
JWT contextual, permissões por ação e cache isolado pela organização ativa.

## Fluxo (camadas da arquitetura)

```text
rota /app/clientes -> PermissionRoute customers:read -> CrudResourcePage
  -> clientesConfig tenant-aware -> React Query [tenant, organizationId, ...]
  -> /api/clientes -> organização resolvida pelo JWT contextual
```

## Endpoints (se houver)

| Método | Contrato | Permissão |
|---|---|---|
| GET | `/api/clientes` e `/{id}` | `customers:read` |
| POST | `/api/clientes` | `customers:manage` |
| PUT | `/api/clientes/{id}` | `customers:manage` |
| DELETE | `/api/clientes/{id}` | `customers:manage` |

A organização não é escolhida por header, query ou payload. URLs, payloads e
respostas continuam compatíveis com a tela anterior.

## Estrutura de Dados (DTOs, Entidades)

`clientesConfig` mantém os campos atuais de identidade, tipo de pessoa,
documentos, contatos, endereço, atributos pessoais e situação. O frontend não
adiciona `organizationId` ao modelo de formulário.

## Integrações externas (se houver)

Nenhuma. O frontend consome somente o backend Kaneko configurado no cliente HTTP.

## Tratamento de Erros

O cliente central converte Problem Details. Contexto inválido retorna `401`,
falta de `customers:read` ou `customers:manage` retorna `403`, recurso ausente ou
de outra organização retorna `404` e conflitos de integridade permanecem `409`.

## Testes (curl ou equivalente)

- `npm test -- --run src/components/crud/resourceConfig.test.ts src/layout/navigation.test.tsx src/App.test.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Decisões Técnicas

- A rota `/app/clientes` e a tela CRUD genérica foram preservadas.
- Navegação, rota e leitura exigem `customers:read`.
- Criar, editar e excluir exigem `customers:manage`.
- Listagens e referências usam chaves React Query iniciadas por
  `['tenant', organizationId]`, impedindo cache cruzado entre organizações.
- Nenhum outro cadastro foi declarado tenant-aware por consequência.

## Módulos relacionados

- [[core]]
- [[auth]]
- [[compatibilidade-legada]]
- [[unificacao-multitenant]]
- [[paridade-api]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-08-03 | Adapta Clientes ao contrato multiempresa V40. |
