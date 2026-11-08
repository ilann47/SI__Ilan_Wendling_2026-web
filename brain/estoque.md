> Links: [[core]] · [[auth]] · [[conveniencia]] · [[unificacao-multitenant]] · [[compatibilidade-legada]] · [[paridade-api]]

# Estoque

O mínimo do catálogo é exibido com seis casas na posição. Saldos, quantidade
movimentada e saldos anterior e posterior também exibem até seis casas.

## Fluxo vigente PARK-0003 (2026-10-16)

Entrada nova ocorre somente por Nota: rascunho -> conferência -> confirmação única.
Não existem aprovação, ordem ou recebimento de compra na web. A Nota de Saída
confirmada é a origem da baixa. O Estoque conserva posição, razão e locais, sem
ajuste ou compensação avulsa; a reversão é feita no documento fiscal.

A composição de custos e parcelas da Nota vem da prévia do backend. Desconto geral
reduz a obrigação e a UI explicita a diferença para o custo, conforme UC401. Cada
item mostra saldo e custo médios atuais, custo unitário de aquisição e o custo médio
ponderado projetado; após confirmação, mostra os valores efetivamente registrados.
Não há reprecificação histórica. A calculadora compartilhada
distribui centavos sem rateio negativo; ela não é a fonte autoritativa dos custos
da Nota.


## Objetivo

Expor a posição e o histórico do estoque da organização ativa e administrar
locais, sem alterar saldo diretamente.

## Contexto

A V54 substitui o saldo mutável sem origem por saldos localizados e movimentos
rastreáveis. A tela `/app/estoque` é independente das movimentações de pátio, do
inventário de vagas e das notas fiscais legadas.

## Fluxo (camadas da arquitetura)

```text
JWT contextual + stock:read
  -> menu superior Estoque (Entradas + Estoque, acesso direto às telas)
  -> /app/estoque?tab=... -> posição / razão / locais
  -> /app/notas-entrada
stock:manage -> CRUD de local com ETag/If-Match
stock:manage -> cadastro rápido de local dentro dos seletores operacionais
```

## Endpoints (se houver)

- `GET /api/v1/stock-positions`: posição por produto e filtro abaixo do mínimo.
- `GET /api/v1/stock-balances`: saldos por produto/local.
- `GET /api/v1/stock-movements[/{id}]`: razão e detalhe append-only.
- `GET/POST /api/v1/stock-locations` e `GET/PUT/DELETE .../{id}`: locais.
- `GET/POST /api/notas-entrada` (+ `/confirmacao`, `/cancelamento`).
- `GET /api/v1/stock-movements/{id}/origin`: origem real navegável quando autorizada pelo backend.
## Estrutura de Dados (DTOs, Entidades)

Posição usa `produtoId`, `produto`, `quantidade`, `quantidadeMinima` e
`abaixoMinimo`. Saldo acrescenta local e versão. Movimento expõe nomes, tipo,
delta, saldos anterior/posterior, custo, origem, ator, motivo e instante. Local
envia somente `nome` e `ativo`.

## Integrações externas (se houver)

Não há.

## Tratamento de Erros

Locais usam ETag forte; 412/428 mantêm a edição aberta e oferecem recarga.
Movimentos antigos continuam consultáveis, sem opção de compensar diretamente.

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
- Razão é append-only e não reutiliza `/api/movimentacoes`.
- Posição e saldos por local têm paginação real de 20 registros e ação Ver movimentos. Filtros usam seletores pesquisáveis, sem pedir IDs; sem `catalog:read`, o produto pode ser filtrado pelo contexto da linha de estoque sem consultar catálogo indevidamente.
- Razão aceita `produtoId`/`localEstoqueId` e `detail` na URL, abre o GET exato mesmo fora da página e apresenta ator, data, motivo, saldo anterior/posterior e origem. A chave técnica não é exibida. Mobile usa ListingCards.
- Movimentos de notas fiscais não oferecem compensação individual no razão. Quando elegível, a reversão integral é feita pelo documento de origem e preserva o movimento original.
- Posicao consolidada, saldos por local e locais cadastrados tambem usam
  `ListingCards` no mobile. Historico abre pelo card e editar/inativar local fica
  no menu de acoes, sem tabela espremida nem botoes concorrentes na horizontal.
- O endereço antigo `?tab=ajustes` abre apenas a posição, sem formulário.
- Consulta de origem tem cache separado por tenant e permissões. Sem vínculo ou permissão, há texto honesto sem link.
- Notas e relatório de estoque mínimo continuam em compatibilidade global.
- Nenhum tenant, nome derivado, ID do recurso ou versão integra payload mutável.
- Mega menu da área Estoque agrupa Entradas e posição; tabs via query string.
- Pendência de estoque mínimo abre a aba existente do relatório diretamente;
  erro/carregamento não é exibido como estoque saudável.
- Calendários ficam acima do modal; valores monetários substituem o zero inicial.
  O diálogo rola em telas menores e exige confirmação antes de descartar mudanças.
- Seletores de local de estoque oferecem cadastro rápido quando o usuário possui
  `stock:manage`. O formulário é o mesmo da gestão de locais, abre empilhado,
  preserva o documento em andamento e seleciona o registro recém-criado. Os
  locais existentes também podem ser editados no seletor com `If-Match`.
- A revisão da Nota de Entrada apresenta, por item, o cálculo ponderado aplicado
  pelo backend. Antes da confirmação identifica o resultado como estimativa; no
  documento confirmado usa o snapshot persistido e identifica-o como registrado.
- O documento da Nota de Entrada prioriza leitura operacional em uma única
  superfície de documento ERP: cabeçalho fiscal compacto, itens tabulares,
  custo médio recolhido por padrão e totais logo abaixo dos itens, sem painel
  lateral flutuante. Estoque e contas a pagar aparecem juntos em `Lançamentos
  gerados`; origem e observações ficam recolhidas. No mobile, linhas e campos
  são empilhados sem rolagem horizontal nem perda de local ou condição.
- Cada lançamento de estoque vinculado à Nota exibe o saldo anterior, a entrada
  e o saldo posterior retornados pelo movimento persistido; o navegador não
  recalcula saldos nem deduz o valor anterior a partir da quantidade.

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
| 2026-11-08 | Mostra a sexta casa na posição, razão e detalhe de estoque sem arredondar para zero. |
| 2026-11-06 | Retira Conferência/Ajustes dos menus e as ações Ajustar estoque e Compensar movimento; razão histórico e locais continuam disponíveis. |
| 2026-11-05 | Exibe movimentos de venda histórica apenas para consulta, sem link para o pedido removido ou compensação isolada. |
| 2026-11-05 | Retira a apresentação de movimento de Pedido de Venda; lançamentos de mercadorias são rastreados pela Nota de Saída. |
| 2026-10-30 | Remove Ordem/Recebimento de Compra, histórico e permissões específicas; Estoque recebe entradas somente pela Nota. |
| 2026-10-30 | Completa o lançamento de estoque da Nota com saldo anterior, entrada e saldo posterior vindos do movimento persistido. |
| 2026-11-05 | Oculta compensação avulsa para movimentos de notas fiscais; orienta a reversão pelo documento de origem. |
| 2026-10-30 | Consolida o documento da Nota de Entrada em uma superfície ERP compacta, com itens tabulares, totais abaixo da composição, custo médio sob demanda e lançamentos reais agrupados; valida desktop e mobile no navegador. |
| 2026-10-23 | Exibe por item da Nota de Entrada o custo médio ponderado projetado e o snapshot registrado na confirmação. |
| 2026-09-29 | Adapta posição, saldos e locais ao mobile com cards, ações contextuais e abas roláveis. |
| 2026-09-29 | Padroniza delta e custo do ajuste, preservando negativo somente para saída. |
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
