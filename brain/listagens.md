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
`ListingCards.test.tsx` verifica campos com Chip usando estrutura HTML válida,
com e sem abertura de detalhe pelo card.
Os testes compartilhados de dialog cobrem fechamento acessível, bloqueio durante
processamento e largura; testes das páginas mantêm compras, estoque, financeiro,
vendas e serviços sobre o mesmo shell modal.
`PurchaseOrdersPage.test.tsx` impede a volta da navegação duplicada à listagem e
confirma o andamento contextual com recebimento, nota e conta vinculados.

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
- `ResourceFormDialog.submitLabel` permite nomear o comando operacional; o padrão continua `Salvar` para manter compatibilidade. Recebimentos usam `Confirmar recebimento`.
- Formulários, confirmações, filtros, seletores e detalhes mobile usam
  `AppDialog`. Filtros deixaram de abrir um drawer lateral vazio e usam um
  diálogo compacto em qualquer viewport; drawers desktop permanecem apenas para
  detalhes extensos de consulta.
- Cada item de um seletor de referência oferece “Editar” quando o cadastro
  possui formulário e o usuário tem permissão de atualização. A edição abre
  empilhada, retorna à lista e não descarta o formulário principal.
- O valor dos campos em `ListingCards` usa `Typography component="div"` para
  aceitar chips de situação sem inserir elementos de bloco dentro de parágrafos.
- Cards clicaveis aceitam rotulo de abertura contextual, evitando a repeticao
  generica de "Abrir detalhes" para varios registros em leitores de tela.
- A listagem de compras mantém somente ação primária, busca, filtros e registros.
  O fluxo genérico e os atalhos duplicados foram removidos; o progresso aparece
  apenas no detalhe da compra e é calculado com os documentos reais vinculados.

## Módulos relacionados

- [[core]]
- [[dashboard]]
- [[workspace]]
- [[clientes]]
- [[fiscal-financeiro]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-09-29 | Substitui o drawer lateral de filtros pelo AppDialog compacto e responsivo, preservando contagem, limpeza e aplicação. |
| 2026-09-29 | Remove a trilha decorativa e os atalhos duplicados da listagem de compras; mantém andamento contextual apenas no detalhe. |
| 2026-09-29 | Inclui ação de edição por item nos seletores de referência, respeitando RBAC e concorrência otimista. |
| 2026-09-12 | Permite título operacional no botão de submissão do formulário, preservando Salvar como padrão e cobrindo ambas as variantes nos testes. |
| 2026-09-12 | Corrige estrutura HTML dos campos com chips no mobile e cobre as variantes do card com teste de regressão de nesting. |
| 2026-09-04 | Cria o shell de listagem/detalhe e alinha o tema ao Hub YES7. |
| 2026-09-04 | Reforça login split-screen, sidebar com marca e item ativo em pill suave. |
| 2026-09-04 | Alinha tokens (#6B46FE, #F4F5FB), hexágono e login ao código-fonte do Hub YES7. |
| 2026-09-11 | Listagem/detalhe dedicados de Nota de Entrada; backlog de vínculos ausentes. |
| 2026-09-11 | Ordens de compra passam a usar menu secundário e `ListingCards` no mobile. |
| 2026-09-12 | Adiciona detalhes por URL tenant-aware, ações contextuais de OS e RBAC dos comandos financeiros; mantém compatibilidade das listagens. |
| 2026-09-28 | Padroniza rótulos de estados, campos e detalhes nas listagens verificadas no navegador, ocultando IDs técnicos quando existe informação operacional. |
| 2026-09-29 | Unifica os modais de listagens e fluxos operacionais em AppDialog, com tamanhos previsíveis, scroll interno e ações persistentes. |
| 2026-09-29 | Adiciona rotulos acessiveis contextuais aos cards operacionais do mobile. |
