> Links: [[core]] · [[auth]] · [[workspace]]

# Administracao Enterprise

## Objetivo

Operar organizacao, Memberships e RBAC contextual usando exclusivamente os
contratos `/api/v1` existentes.

## Contexto

O perfil empresarial e carregado pelo ID do tenant presente no JWT. Usuario sem
Membership pode provisionar a primeira organizacao somente quando possui perfil
global `ADMIN`. A API nao lista Memberships, papeis ou atribuicoes; por isso a UI
aceita identificadores conhecidos e deixa essa limitacao explicita.

## Fluxo (camadas da arquitetura)

```text
AdministrationPage -> cliente HTTP -> controllers organization/membership/rbac
                  -> If-Match com version -> PostgreSQL
```

## Endpoints (se houver)

- `POST/GET/PATCH /api/v1/organizations`
- `POST/GET/PATCH /api/v1/organizations/{id}/memberships`
- `POST/DELETE .../role-assignments`
- `GET /api/v1/me`

## Estrutura de Dados (DTOs, Entidades)

Os formularios espelham `OrganizacaoResponse`, `MembershipResponse` e
`AtribuicaoAcessoResponse`. Documento, estado e versao da organizacao sao
somente leitura. Alteracoes concorrentes enviam `If-Match` estrito.

## Integracoes externas (se houver)

Nenhuma.

## Tratamento de Erros

Problem Details e erros de validacao sao exibidos no painel da operacao. A UI
exige consulta da Membership antes de transicionar seu estado.

## Testes (curl ou equivalente)

Vitest cobre provisionamento da primeira organizacao e atualizacao concorrente
com a versao carregada.

## Decisoes Tecnicas

- Nenhuma listagem e simulada quando o backend nao a oferece.
- Os papeis selecionaveis sao o catalogo de sistema definido nas migrations.
- Encerramento de Membership permanece terminal.
- `users:invite` monta somente a criação; consulta e transição de Membership
  exigem `organizations:admin`. Concessão e revogação respeitam permissões distintas.

## Modulos relacionados

- [[auth]]
- [[workspace]]
- [[core]]

## Historico (data + acao)

| Data | Acao |
|---|---|
| 2026-08-03 | Implementa provisionamento, perfil empresarial, Memberships e RBAC contextual. |
| 2026-08-03 | Alinha cada comando administrativo à permissão do controller. |
