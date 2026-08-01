> Links: [[core]]

# Autenticação e Contexto Organizacional

## Objetivo

Autenticar a identidade global e selecionar de forma segura o tenant ativo.

## Contexto

O backend mantém `Usuario` global, lista Memberships ativas e emite um novo JWT
quando o usuário seleciona a organização.

## Fluxo (camadas da arquitetura)

```text
POST /api/auth/login
  -> armazena JWT global
  -> GET /api/v1/me/organizations
  -> zero: compatibilidade legada
  -> uma: seleção automática
  -> várias: tela de seleção
  -> POST /api/v1/me/active-organization
  -> substitui pelo JWT contextual
  -> GET /api/v1/me/permissions
```

## Endpoints (se houver)

- `GET /api/v1/me/organizations`
- `POST /api/v1/me/active-organization`
- `GET /api/v1/me/permissions`

## Estrutura de Dados (DTOs, Entidades)

`AccessibleOrganization` preserva IDs de organização/Membership e os nomes de
exibição. As permissões efetivas são mantidas separadamente da autoridade legada.

## Integrações externas (se houver)

Nenhuma.

## Tratamento de Erros

Resposta 401 limpa toda a sessão. Falha de seleção permanece na tela e permite
nova tentativa sem assumir outro tenant.

## Testes (curl ou equivalente)

Validação disponível por `npm run typecheck` e `npm run build`.

## Decisões Técnicas

- O cliente envia somente `organizationId`; Membership e versão vêm do servidor.
- A organização ativa é inferida da claim `org_id` apenas para reconstruir a UI;
  o backend continua sendo a autoridade de escopo.

## Módulos relacionados

- [[core]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-01 | Implementa descoberta e seleção de organização com JWT contextual. |
