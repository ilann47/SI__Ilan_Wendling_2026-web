> Links: [[core]] · [[auth]] · [[paridade-api]] · [[eventos]]

# Compatibilidade Legada

## Objetivo

Preservar no frontend as funcionalidades anteriores enquanto os módulos de
eventos são incorporados ao mesmo produto.

## Contexto

O shell multiempresa havia substituído a tabela de rotas e o menu anteriores,
embora páginas, configurações CRUD, tipos e APIs legadas continuassem presentes.
A compatibilidade restaura essas superfícies sem remover os fluxos enterprise.

## Fluxo (camadas da arquitetura)

```text
AppLayout
  -> grupo funcional legado
  -> PatioPage, RelatoriosPage ou CrudResourcePage
  -> ResourceConfig
  -> api/client
  -> controller legado /api/*
```

## Endpoints (se houver)

As telas consomem os contratos legados já existentes sob `/api/*`, incluindo
pátio e movimentações, notas de entrada/saída/serviço, financeiro, cadastros,
conveniência, logística, geografia, RH e usuários.

## Estrutura de Dados (DTOs, Entidades)

`allConfigs` registra os CRUDs antigos. `PatioPage` e `RelatoriosPage` continuam
como páginas próprias. `App.tsx` materializa uma rota para cada configuração e
`navigation.tsx` organiza os acessos por área funcional.

## Integrações externas (se houver)

Nenhuma nova integração. As telas chamam somente o backend existente.

## Tratamento de Erros

Permanece centralizado em `api/client` e nos componentes CRUD. As APIs legadas
não possuem escopo por organização; esse risco não é ocultado nem corrigido no
frontend.

## Testes (curl ou equivalente)

`App.test.tsx` protege rotas representativas de operação, fiscal e conveniência.
`navigation.test.tsx` impede nova remoção silenciosa dos módulos do menu.

## Decisões Técnicas

- Os módulos antigos e enterprise coexistem no mesmo shell.
- Nenhum contrato legado foi reimplementado ou substituído por mock.
- A compatibilidade não concede semântica tenant-aware a endpoints que não a têm.
- A futura migração do legado para organização exige alteração explícita no backend.

## Módulos relacionados

- [[core]]
- [[auth]]
- [[paridade-api]]
- [[eventos]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-08-03 | Restaura rotas e navegação legadas ao lado dos módulos de eventos. |
