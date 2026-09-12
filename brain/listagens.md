> Links: [[core]] · [[dashboard]] · [[workspace]] · [[clientes]] · [[fiscal-financeiro]]

# Listagens e detalhes

## Objetivo

Padronizar listagens operacionais no visual do Hub YES7: fundo slate, azul só
na ação primária, busca imediata, filtros avançados recolhidos e detalhe em
drawer sem inventar dados.

## Contexto

O shell `CrudResourcePage` cobre os cadastros de `allConfigs`. Páginas
comerciais (ordens de compra, vendas administrativas e ordens de serviço)
reutilizam os mesmos componentes. Preferências visuais ficam em
`kaneko.ui.{orgId}.{login}`; tokens e dados empresariais não são persistidos.

## Fluxo (camadas da arquitetura)

```text
ResourceConfig -> CrudResourcePage
  -> ListingToolbar / FilterBar / AppliedFilterChips
  -> DataGrid (desktop) ou ListingCards (mobile)
  -> clique na linha -> GET /{id} -> DetailDrawer
```

## Endpoints (se houver)

Cada recurso usa o `basePath` já contratado. O detalhe chama `GET {basePath}/{id}`
quando o item é aberto. Relacionamentos sem contrato aparecem como texto honesto.

## Estrutura de Dados (DTOs, Entidades)

`ResourceConfig` aceita `searchFilter` e `unavailableRelations`. O detalhe
mostra campos do GET e tabelas de itens apenas quando a resposta traz arrays.
`useLinkedDetail` resolve `?detail=ID` por GET existente, com cache por organização,
permissão de leitura, validação de ID inteiro positivo e estados de erro/consulta.
Funciona mesmo fora da primeira página. Fechar remove somente `detail` da URL.
`rowActionPermissions` permite restringir comandos sem exigir edição do formulário.

## Integrações externas (se houver)

Nenhuma.

## Tratamento de Erros

Skeleton no carregamento, `ErrorState` com Problem Details e retry, `EmptyState`
quando a busca ou o filtro não encontra registros.

## Testes (curl ou equivalente)

`src/components/listing/listing.test.tsx` cobre estados vazios, chips e detalhe.
As páginas CRUD existentes continuam passando pela suíte Vitest.

## Decisões Técnicas

- Azul `#1565c0` fica reservado ao botão primário; status usa verde/âmbar/vermelho.
- Ações secundárias ficam no menu ⋮ para não competir com a ação principal.
- Ausência de vínculo na API vira `Informação não disponibilizada pela API atual`.
- Dependências de contrato estão em `src/backlog/backend-dependencies.md`.
- Contas, compras e ordens de serviço aceitam deep-link de detalhe. O erro do
  GET não é convertido em recurso inexistente fictício nem em dados de outra organização.
- Na OS, Iniciar/Concluir é a ação principal conforme estado; Editar/Cancelar
  ficam no menu secundário. O detalhe mantém a ação e o mobile usa `ListingCards`.
  Todas as mutações continuam confirmadas e usam os contratos/versões existentes.
- Nota de Entrada usa listagem dedicada + rota de detalhe (não só drawer CRUD).

## Módulos relacionados

- [[core]]
- [[dashboard]]
- [[workspace]]
- [[clientes]]
- [[fiscal-financeiro]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-09-04 | Cria o shell de listagem/detalhe e alinha o tema ao Hub YES7. |
| 2026-09-04 | Reforça login split-screen, sidebar com marca e item ativo em pill suave. |
| 2026-09-04 | Alinha tokens (#6B46FE, #F4F5FB), hexágono e login ao código-fonte do Hub YES7. |
| 2026-09-11 | Listagem/detalhe dedicados de Nota de Entrada; backlog de vínculos ausentes. |
| 2026-09-11 | Ordens de compra passam a usar menu secundário e `ListingCards` no mobile. |
| 2026-09-12 | Adiciona detalhes por URL tenant-aware, ações contextuais de OS e RBAC dos comandos financeiros; mantém compatibilidade das listagens. |
