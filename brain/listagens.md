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
