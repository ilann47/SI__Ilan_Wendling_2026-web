> Links: [[core]] · [[auth]] · [[administracao]] · [[acesso]]

# Workspace Operacional

## Objetivo

Preservar referencias de recursos realmente retornados pela API para encadear
fluxos em que o backend ainda nao fornece endpoints de listagem.

## Contexto

Cada Membership possui armazenamento local separado dentro da organizacao. O
workspace guarda no maximo 20 snapshots recentes por tipo e nunca cria
entidades ficticias.

## Fluxo (camadas da arquitetura)

```text
resposta API -> remember(kind, recurso) -> estado React
  -> localStorage por organizacao + Membership
troca de contexto -> recarrega somente
  kaneko.workspace.{organizationId}.{membershipId}
```

## Endpoints (se houver)

Nenhum.

## Estrutura de Dados (DTOs, Entidades)

`WorkspaceResource` contem ID, rotulo, versao, data de atualizacao e snapshot
opcional da resposta real.

## Integracoes externas (se houver)

Nenhuma.

## Tratamento de Erros

JSON local invalido e ignorado. Escrita sem tenant ativo falha cedo.

## Testes (curl ou equivalente)

Vitest cobre isolamento da chave por organizacao/Membership e atualizacao sem
duplicidade.

## Decisoes Tecnicas

- O workspace e conveniencia de navegacao, nao fonte de verdade.
- Consultas disponiveis sempre prevalecem sobre snapshots locais.
- A chave antiga somente por organizacao nao e migrada, pois reaproveita-la
  poderia expor referencias locais entre usuarios do mesmo navegador.

## Modulos relacionados

- [[auth]]
- [[administracao]]
- [[acesso]]
- [[core]]

## Historico (data + acao)

| Data | Acao |
|---|---|
| 2026-08-03 | Cria referencias recentes isoladas por organizacao. |
| 2026-08-03 | Isola referencias tambem por Membership e abandona a chave compartilhada antiga. |
