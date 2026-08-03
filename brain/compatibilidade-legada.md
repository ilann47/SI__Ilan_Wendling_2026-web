> Links: [[core]] · [[auth]] · [[paridade-api]] · [[eventos]] · [[pagamentos]] · [[clientes]]

# Compatibilidade Legada

## Objetivo

Preservar integralmente as funcionalidades anteriores e conduzi-las, módulo a
módulo, ao mesmo contrato multiempresa adotado pelas capacidades enterprise.

## Contexto

O shell multiempresa havia substituído a tabela de rotas e o menu anteriores,
embora páginas, configurações CRUD, tipos e APIs legadas continuassem presentes.
A restauração corrigiu a regressão funcional. A etapa seguinte não é uma
descontinuação: é o retrofit tenant-aware dos contratos `/api/*`, preservando
URLs quando possível e proibindo seleção de organização por payload ou header.

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

Permanece centralizado em `api/client` e nos componentes CRUD. As APIs legadas,
exceto pagamentos V38 e Clientes V40, ainda não possuem escopo por organização;
esse risco não é ocultado nem corrigido no frontend.

## Testes (curl ou equivalente)

`App.test.tsx` protege rotas representativas de operação, fiscal e conveniência.
`navigation.test.tsx` impede nova remoção silenciosa dos módulos do menu.

## Decisões Técnicas

- Os módulos antigos e enterprise coexistem no mesmo shell.
- Nenhum contrato legado foi reimplementado ou substituído por mock.
- A compatibilidade não concede semântica tenant-aware a endpoints que não a têm.
- A migração do legado para organização é parte obrigatória do produto e exige
  alteração explícita no backend antes de qualquer tela ser declarada isolada.
- Paridade funcional e paridade tenant-aware são critérios independentes.
- Dados históricos sem proprietário continuam visíveis apenas pelo fluxo de
  reconciliação autorizado; o frontend não atribui tenant implicitamente.

## Módulos relacionados

- [[core]]
- [[auth]]
- [[paridade-api]]
- [[eventos]]
- [[pagamentos]]
- [[clientes]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-08-03 | Restaura rotas e navegação legadas ao lado dos módulos de eventos. |
| 2026-08-03 | Torna permanente a integração dos módulos legados e registra o retrofit multi-tenant obrigatório. |
| 2026-08-03 | Registra pagamentos como primeira fatia legada adaptada ao JWT contextual V38. |
| 2026-08-03 | Registra Clientes como segunda fatia legada adaptada ao JWT contextual V40. |
