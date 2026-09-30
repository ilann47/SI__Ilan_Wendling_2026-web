> Links: [[core]] · [[auth]] · [[conveniencia]] · [[unificacao-multitenant]] · [[compatibilidade-legada]] · [[paridade-api]]

# Estoque

## Objetivo

Expor a posição e a razão append-only do estoque da organização ativa, além da
administração de locais e dos comandos compensatórios autorizados.

## Contexto

A V54 substitui o saldo mutável sem origem por saldos localizados e movimentos
rastreáveis. A tela `/app/estoque` é independente das movimentações de pátio, do
inventário de vagas e das notas fiscais legadas.

## Fluxo (camadas da arquitetura)

```text
JWT contextual + stock:read
  -> menu superior Estoque (Compras + Estoque, acesso direto às telas)
  -> /app/estoque?tab=... -> posição / razão / locais / ajustes
  -> /app/ordens-compra, /app/recebimentos, /app/notas-entrada
stock:manage -> ajuste ou compensação idempotente
stock:manage -> CRUD de local com ETag/If-Match
stock:manage -> cadastro rápido de local dentro dos seletores operacionais
```

## Endpoints (se houver)

- `GET /api/v1/stock-positions`: posição por produto e filtro abaixo do mínimo.
- `GET /api/v1/stock-balances`: saldos por produto/local.
- `GET /api/v1/stock-movements[/{id}]`: razão e detalhe append-only.
- `GET/POST /api/v1/stock-locations` e `GET/PUT/DELETE .../{id}`: locais.
- `POST /api/v1/stock-adjustments`: ajuste com `Idempotency-Key`.
- `POST /api/v1/stock-movements/{id}/compensation`: compensação com chave e motivo.
- `GET/POST /api/v1/purchase-orders` e recebimentos por ordem.
- `GET /api/v1/purchase-orders/{id}/documents`: consulta integrada com notas, contas e razão; seções sem permissão retornam `null`.
- `GET/POST /api/notas-entrada` (+ `/confirmacao`, `/cancelamento`).
- `GET /api/v1/stock-movements/{id}/origin`: origem real navegável quando autorizada pelo backend.
## Estrutura de Dados (DTOs, Entidades)

Posição usa `produtoId`, `produto`, `quantidade`, `quantidadeMinima` e
`abaixoMinimo`. Saldo acrescenta local e versão. Movimento expõe nomes, tipo,
delta, saldos anterior/posterior, custo, origem, ator, motivo e instante. Local
envia somente `nome` e `ativo`. Ajuste envia somente `produtoId`,
`localEstoqueId`, `delta`, `custoUnitario` opcional e `motivo`.
Ordem de compra expõe a chave fiscal fornecedor/número/série/modelo, comprador,
condição de pagamento, transportadora, local
planejado de entrega, responsabilidade do frete, referência do fornecedor,
observação interna, seguro e outras despesas. Por item, expõe código no
fornecedor, desconto, rateios de despesas, custo total e custo unitário final.

## Integrações externas (se houver)

Não há. O seletor de produto consulta o catálogo tenant-aware e, por isso, o
ajuste exige cumulativamente `stock:manage` e `catalog:read` na interface.

## Tratamento de Erros

`409` preserva o mesmo intento idempotente para correção/reenvio. Locais usam
ETag forte; 412/428 mantêm a edição aberta e oferecem recarga. Movimentos nunca
são editados ou excluídos; correções geram compensação com motivo.

## Testes (curl ou equivalente)

Vitest cobre rotas, menu, cache por tenant, filtros, payload fechado,
Idempotency-Key, permissão cumulativa e ETag pelo cliente genérico. Os gates são
typecheck, lint, testes focalizados e build.
O cadastro contextual de local possui regressão própria para permissão, criação,
seleção automática e preservação do documento principal. Em 2026-09-29, os 359
testes do frontend, typecheck, lint e build passaram. Após a herança visível dos
padrões comerciais do fornecedor, a regressão integral passou com 361 testes;
com a edição contextual dos seletores, passou com 363 testes.
Na entrega integrada de 2026-09-12, os gates finais typecheck/lint/build e 19 testes focais de financeiro, home e estoque passaram. Estoque cobre query keys, contratos, detalhe por URL, ator/motivo/origem e bloqueio de links sem permissão mesmo com resposta residual.
O andamento contextual possui testes para compra aprovada, entrega rejeitada e
fluxo concluído. Em 2026-09-29, a regressão integral passou com 366 testes em 67
arquivos, além de typecheck, lint e build.

## Decisões Técnicas

- A listagem funciona somente com `stock:read` porque respostas incluem nomes.
- Ajuste é ocultado sem `catalog:read`; compensação não depende desse lookup.
- Razão é append-only e não reutiliza `/api/movimentacoes`.
- Posição e saldos por local têm paginação real de 20 registros e ação Ver movimentos. Filtros usam seletores pesquisáveis, sem pedir IDs; sem `catalog:read`, o produto pode ser filtrado pelo contexto da linha de estoque sem consultar catálogo indevidamente.
- Razão aceita `produtoId`/`localEstoqueId` e `detail` na URL, abre o GET exato mesmo fora da página e apresenta ator, data, motivo, saldo anterior/posterior e origem. A chave técnica não é exibida. Mobile usa ListingCards; compensação fica no detalhe.
- Posicao consolidada, saldos por local e locais cadastrados tambem usam
  `ListingCards` no mobile. Historico abre pelo card e editar/inativar local fica
  no menu de acoes, sem tabela espremida nem botoes concorrentes na horizontal.
- Consulta de origem tem cache separado por tenant e permissões; recebimento abre `/app/ordens-compra?detail=OC&recebimentoId=ID` com destaque implementado pelo módulo de compras. Sem vínculo/permissão, há texto honesto sem link.
- Notas e relatório de estoque mínimo continuam em compatibilidade global.
- Nenhum tenant, nome derivado, ID do recurso ou versão integra payload mutável.
- Mega menu da área Estoque agrupa Compras e posição; tabs via query string.
- Pendência de compra abre o GET da OC por `?detail=ID`, mesmo fora da página
  atual. O detalhe oferece Aprovar/Receber conforme estado e `purchases:manage`.
- Pendência de estoque mínimo abre a aba existente do relatório diretamente;
  erro/carregamento não é exibido como estoque saudável.
- O detalhe da compra mostra entregas com responsável, nota por recebimento e contas com links para o registro exato. Uma nota existente substitui o CTA de geração por “Ver nota”. A chave da criação/recebimento permanece estável até sucesso, inclusive após erro recuperável.
- O cadastro da compra apresenta os itens, depois frete, seguro e outras
  despesas, e só então o resumo de quantidade, produtos e total estimado. Essa
  ordem mantém os valores que alimentam o cálculo antes do resultado e recalcula
  o custo unitário estimado enquanto o usuário informa as despesas. A regra exposta ao usuário permite
  desconto somente por item; o campo geral legado é enviado como zero e também é
  recusado pelo backend e pelo banco. O resumo calcula o total estimado da ordem.
- Fornecedor, número, série e modelo liberam o restante do cadastro e ficam
  bloqueados após o primeiro produto. O identificador técnico da ordem não é
  digitado nem exibido como referência operacional.
- Dados comerciais e de entrega usam seletores tenant-aware para condição de
  pagamento, transportadora e local planejado. A responsabilidade do frete,
  referência do fornecedor e observação interna ficam separadas da observação
  enviada ao fornecedor. O recebimento sugere o local planejado da ordem.
- Ao selecionar um fornecedor, a interface preenche imediatamente a condição de
  pagamento e a transportadora cadastradas nele. Os dois padrões continuam
  substituíveis; se o cliente omitir os campos, o backend repete a herança como
  garantia da regra de negócio.
- Calendários ficam acima do modal; valores monetários substituem o zero inicial.
  O diálogo rola em telas menores e exige confirmação antes de descartar mudanças.
- Seletores de local de estoque oferecem cadastro rápido quando o usuário possui
  `stock:manage`. O formulário é o mesmo da gestão de locais, abre empilhado,
  preserva o documento em andamento e seleciona o registro recém-criado. Os
  locais existentes também podem ser editados no seletor com `If-Match`.
- O recebimento não permite edição de quantidade: todos os itens entram pelo
  saldo integral ou a entrega inteira é rejeitada. O wizard fiscal reaproveita
  preço, desconto e a chave da compra para conferir o documento do fornecedor.
- A nota preserva o link exato da compra (`?detail=ID`); criar o rascunho usa idempotência. Se confirmar falhar, a interface consulta a situação antes de repetir qualquer ação. Nota vinculada deixa explícito que estoque já entrou pelo recebimento.
- A listagem de compras não exibe mais o fluxo genérico nem atalhos repetidos.
  No detalhe, `Ordem → Recebimento → Nota → Conta` reflete o status da ordem e
  a existência real de recebimentos, notas e contas; relações sem permissão ou
  indisponíveis são identificadas sem presumir conclusão. A home resume esse
  caminho no cartão do módulo Estoque sem acrescentar novas ações.

## Módulos relacionados

- [[core]]
- [[auth]]
- [[conveniencia]]
- [[unificacao-multitenant]]
- [[compatibilidade-legada]]
- [[paridade-api]]
- [[fiscal-financeiro]]

## Histórico (data + ação)

| Data | Ação |
|---|---|
| 2026-09-29 | Adapta posição, saldos e locais ao mobile com cards, ações contextuais e abas roláveis. |
| 2026-09-29 | Move frete, seguro e outras despesas para antes do resumo de totais da Ordem de Compra, mantendo as observações por último. |
| 2026-09-29 | Move o andamento da compra da listagem para o detalhe contextual e resume o fluxo no módulo Estoque da home. |
| 2026-09-29 | Permite editar locais e demais referências diretamente no seletor, preservando ETag e o documento em andamento. |
| 2026-09-29 | Torna visível a herança de condição de pagamento e transportadora ao selecionar o fornecedor, mantendo substituição manual e fallback no backend. |
| 2026-09-29 | Reorganiza o detalhe da compra em drawer amplo, blocos responsivos, itens em cards e totais legíveis, eliminando a tabela espremida e a rolagem horizontal. |
| 2026-09-29 | Padroniza o alinhamento dos campos de itens e reserva uma linha estável para mensagens de validação, evitando saltos visuais quando um campo entra em erro. |
| 2026-09-29 | Valida o desconto de cada item contra quantidade × valor unitário, exibe o limite em moeda no próprio campo e bloqueia o salvamento inválido. |
| 2026-09-29 | Aplica chave fiscal obrigatória no início da compra, trava-a após o primeiro produto, substitui recebimentos parciais por recebimento ou rejeição integral e valida o comportamento no navegador e na regressão de 360 testes. |
| 2026-09-29 | Integra o cadastro rápido de local de estoque aos seletores da Ordem de Compra e demais fluxos, preservando o formulário em andamento. |
| 2026-09-29 | Completa a Ordem de Compra com dados comerciais e de entrega, comprador rastreável, desconto apenas por item e sugestão do local no recebimento. |
| 2026-09-29 | Valida no navegador a lista, o formulário, o calendário sobreposto e o detalhe comercial da ordem demo sem persistir alterações. |
| 2026-09-28 | Impede quantidade e valores negativos na OC com validação inline e bloqueio de salvamento. |
| 2026-09-28 | Corrige o calendário da OC que abria atrás do modal por divergência entre o z-index visual e o valor do tema. |
| 2026-09-28 | Remove o desconto geral da OC; mantém desconto somente por item e zera o campo legado no contrato. |
| 2026-09-25 | Reorganiza a OC, corrige modal/data/valores e mostra totais, rateios, custo final e código do produto no fornecedor. |
| 2026-09-12 | Integra OC → recebimentos → notas → contas, preserva chaves em falhas, recupera confirmação por consulta e rateia os centavos negociados entre entregas. Exibe saldo financeiro do servidor; fallback legado zera contas canceladas. Condição de pagamento ausente usa “Não informada”. Diálogo usa “Confirmar recebimento” com efeito no estoque explícito e quantidades conferidas manualmente. |
| 2026-08-03 | Integra posição, razão, locais, ajustes e compensações V54. |
| 2026-09-11 | Área Estoque com mega menu por processo e deep-links de abas. |
| 2026-09-11 | Mega menus em todas as áreas + trilha de processo Compras. |
| 2026-09-11 | Remove passagem pela home da área; processos abrem direto pelo topo, sem sidebar/abas nem atalhos repetidos na listagem de notas. |
| 2026-09-11 | Ações do dia na área Estoque e CTA pós-recebimento para lançar a nota. |
| 2026-09-12 | Conecta pendências a compras específicas e à relação de estoque mínimo; mantém ações operacionais no detalhe. |
| 2026-09-12 | Pagina posição/saldos/razão, substitui IDs manuais por seletores e conecta rastreabilidade a documentos reais; testes de URL/detalhe/ator/origem incluídos. |
| 2026-09-28 | Valida compras e razão no navegador, corrige estados e remove o falso saldo do cadastro de produtos em favor do estoque mínimo e da razão real. |
| 2026-09-29 | Padroniza modais de compra, recebimento, histórico, ajuste e compensação com larguras semânticas e ações fixas. |
