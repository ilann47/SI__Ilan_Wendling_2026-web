> Links: [[core]] · [[dashboard]] · [[workspace]] · [[clientes]] · [[fiscal-financeiro]]

# Listagens e detalhes

## Objetivo

Padronizar listagens operacionais no visual do Hub YES7: fundo slate, azul só
na ação primária, busca imediata, filtros avançados recolhidos e detalhe em
drawer sem inventar dados.

## Contexto

O shell `CrudResourcePage` cobre os cadastros de `allConfigs`. Páginas
comerciais (notas de saída e ordens de serviço)
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

Campos de texto podem declarar limite de comprimento em `FieldConfig`. O
`FieldRenderer` sinaliza o excesso sem truncar conteúdo digitado ou colado;
o modo de teclado é opcional e não converte o valor em número.
Máscaras de telefone e CEP são opt-in e recusam edições fora dos limites
sem truncar a colagem nem substituir silenciosamente o valor anterior.

Skeleton no carregamento, `ErrorState` com Problem Details e retry, `EmptyState`
quando a busca ou o filtro não encontra registros.

## Testes (curl ou equivalente)

`src/components/listing/listing.test.tsx` cobre estados vazios, chips e detalhe.
As páginas CRUD existentes continuam passando pela suíte Vitest.
`ListingCards.test.tsx` verifica campos com Chip usando estrutura HTML válida,
com e sem abertura de detalhe pelo card.
Os testes compartilhados de dialog cobrem fechamento acessível, bloqueio durante
processamento e largura; testes das páginas mantêm estoque, financeiro,
documentos fiscais e serviços sobre o mesmo shell modal.

## Decisões Técnicas

- Azul `#1565c0` fica reservado ao botão primário; status usa verde/âmbar/vermelho.
- Ações secundárias ficam no menu ⋮ para não competir com a ação principal.
- Ausência de vínculo vira `Informação não disponível nesta versão`, sem expor
  termos de implementação ao operador.
- Dependências de contrato estão em `src/backlog/backend-dependencies.md`.
- Contas e ordens de serviço aceitam deep-link de detalhe. O erro do
  GET não é convertido em recurso inexistente fictício nem em dados de outra organização.
- Na OS, Iniciar/Concluir é a ação principal conforme estado; Editar/Cancelar
  ficam no menu secundário. O detalhe mantém a ação e o mobile usa `ListingCards`.
  Todas as mutações continuam confirmadas e usam os contratos/versões existentes.
- Nota de Entrada usa listagem dedicada + rota de detalhe (não só drawer CRUD).
- `ResourceFormDialog.submitLabel` permite nomear o comando operacional; o padrão continua `Salvar` para manter compatibilidade.
- `ResourceFormDialog` anuncia o formulario e o estado ocupado, troca a acao por
  “Salvando…” com progresso visivel e bloqueia fechamento/reenvio enquanto a
  mutacao esta em andamento.
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
  O fluxo genérico e os atalhos duplicados foram removidos; o progresso aparece
  apenas no detalhe da compra e é calculado com os documentos reais vinculados.
- Listagens genéricas não exibem nem filtram pelo identificador interno na tela
  principal. O código permanece apenas como informação secundária do detalhe.
- Resumos de operações ocultam identificadores e revisões de concorrência e
  traduzem os campos operacionais antes de exibi-los.
- A barra de listagem agrupa busca e filtros numa única superfície, oferece
  limpeza explícita da busca e mantém os filtros aplicados independentes.
- Cabeçalhos de página preservam título, contexto, contagem e uma ação primária;
  no mobile a descrição continua visível e a ação ocupa a largura disponível.
- O `PageHeader` oferece sempre o retorno no topo esquerdo das páginas internas.
  Ele usa o histórico do roteador e abre o Hub quando a tela foi acessada
  diretamente, evitando sair da aplicação ou duplicar botões locais de voltar.
- Detalhes desktop usam cabeçalho e ações fixos com conteúdo central rolável;
  cards mobile agrupam rótulo e valor com alvos de abertura ampliados.

## Módulos relacionados

- [[core]]
- [[dashboard]]
- [[workspace]]
- [[clientes]]
- [[fiscal-financeiro]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-11-08 | Listas e detalhes preservam até seis casas sem alterar contadores; campos calculados somente leitura não invalidam a edição. |
| 2026-11-05 | Retira listagem de Pedido de Venda e seus vínculos navegáveis; preserva as listagens de notas e OS. |
| 2026-10-30 | Remove listagens e detalhes de Ordem/Recebimento de Compra; Notas de Entrada permanecem dedicadas. |
| 2026-10-30 | Padroniza o botão Voltar no topo esquerdo de todos os `PageHeader`, com histórico real, fallback para o Hub e remoção da duplicidade no detalhe da Nota. |
| 2026-10-30 | Aplica hierarquia, proximidade e consistência às listagens globais, com busca agrupada, limpeza rápida, estados vazios delimitados e detalhes sem estouro horizontal. |
| 2026-10-24 | QA desktop/mobile remove IDs das tabelas e filtros genéricos, rebaixa o código no detalhe e elimina chaves técnicas dos resumos. |
| 2026-10-24 | Remove a palavra API da mensagem compartilhada de informação indisponível e protege o texto com regressão. |
| 2026-10-30 | Padroniza feedback de envio nos formularios compartilhados com progresso acessivel, rotulo de ocupado e bloqueio de acoes duplicadas. |
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
| 2026-11-06 | Adiciona suporte opt-in a limite de texto e teclado contextual nos formulários. |
| 2026-11-06 | Adiciona máscaras opt-in de telefone e CEP ao renderizador compartilhado. |
| 2026-11-06 | Permite que o shell encaminhe seleção de linha e cadastro criado a um detalhe dedicado, mantendo o drawer nos demais módulos. |
