> Links: [[auth]]

# Core do Frontend

## Objetivo

SPA React/Vite que preserva as telas legadas e passa a consumir gradualmente os
contratos tenant-aware `/api/v1` do backend Kaneko.

## Contexto

O frontend é um repositório Git próprio dentro do projeto Java. Axios injeta o
JWT corrente; React Router protege a área autenticada e TanStack Query gerencia
estado de servidor.

## Decisões Técnicas

- O login continua emitindo JWT global compatível com as APIs legadas.
- A seleção de organização é resolvida pelo servidor e substitui o token global
  por JWT contextual; nenhum `organizationId` é injetado por header.
- Usuário sem Membership conserva o fluxo legado. Uma única organização é
  selecionada automaticamente; múltiplas exigem escolha explícita.

## Módulos relacionados

- [[auth]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-01 | Inicializa o brain do frontend e registra o contexto multiempresa. |
