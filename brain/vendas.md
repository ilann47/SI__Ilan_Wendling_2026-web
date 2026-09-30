> Links: [[core]] · [[auth]] · [[workspace]] · [[eventos]] · [[acesso]]

# Pedidos de venda e vendas de eventos

## Objetivo

Operar o funil real de reserva temporaria, pedido, confirmacao/cancelamento e
emissao de credenciais de acesso.

Na operação comercial, apresentar `VendaAdministrativa` como **Pedidos de venda**,
conectando cliente/produtos, confirmação, nota de saída e recebimento. O nome do
agregado, contratos `/administrative-sales` e rota `/app/vendas-administrativas`
permanecem compatíveis; esse fluxo não utiliza o pedido de ingresso de evento.

## Contexto

Disponibilidade nao reserva estoque. A interface cria um hold idempotente, usa o
hold no pedido e permite confirmacao manual somente quando autorizada. Listagem
de pedidos e sempre limitada ao ator autenticado pelo backend.

## Fluxo (camadas da arquitetura)

```text
Disponibilidade -> Hold -> Pedido -> Confirmacao -> Credencial -> Token QR
                         \-> Cancelamento -> liberacao/bloqueio/reembolso pendente
```

```text
Pedidos de venda -> confirmação (baixa estoque + gera recebíveis)
                 -> preparar nota de saída pendente (sem repetir lançamentos)
                 -> consultar nota / parcelas / razão de estoque no detalhe
```

## Endpoints (se houver)

- `POST/GET /api/v1/inventory-holds`
- `POST /api/v1/inventory-holds/{id}/release`
- `POST/GET /api/v1/orders`
- `POST /api/v1/orders/{id}/manual-confirmation|cancellation`
- `POST /api/v1/orders/{id}/credentials`
- `GET /api/v1/credentials/{id}`
- `POST /api/v1/credentials/{id}/qr-code`
- `GET/POST /api/v1/administrative-sales` e `GET/PUT /api/v1/administrative-sales/{id}`
- `POST /api/v1/administrative-sales/{id}/confirmation|cancellation` com `If-Match`
- `GET /api/v1/administrative-sales/{id}/documents`: `nota`, `contas`, `movimentos`;
  seções protegidas respectivamente por `fiscal:read`, `finance:read`, `stock:read`.
- `POST /api/v1/administrative-sales/{id}/outbound-note`: `Idempotency-Key` e
  `numero` obrigatório (20 caracteres); `modelo` e `serie` opcionais (10 caracteres),
  `dataEmissao` e `dataSaida` opcionais. Cliente, itens e valores vêm do servidor.

## Estrutura de Dados (DTOs, Entidades)

As telas refletem ReservaInventario, Pedido/ItemPedido, CancelamentoPedido,
CredencialAcesso e RepresentacaoQr. Chaves idempotentes sao novas por intencao;
If-Match usa a versao consultada ou retornada.

`AdministrativeSaleDocuments` contém somente vínculos persistidos consultados no
servidor. Valores e parcelas são exibidos a partir das respostas reais. O saldo a
receber soma o saldo dos títulos não cancelados, `valorTotal - valorRecebido`.

## Integracoes externas (se houver)

Pagamento e reembolso externos permanecem bloqueados conforme a matriz oficial.

## Ordens de serviço no fluxo comercial

`ServiceOrdersPage` mantém execução `RASCUNHO -> EM_EXECUCAO -> CONCLUIDA` sem
gerar cobrança na conclusão. O detalhe fica aberto após transições, permite
preparar a nota a partir da ordem concluída e consultar seus recebíveis.

- `GET /api/v1/service-orders/{id}/documents`: `nota` e `contas` reais;
  leitura base `service_orders:read`, seções `fiscal:read` e `finance:read`.
- `POST /api/v1/service-orders/{id}/service-note`: `Idempotency-Key`, `numero`
  obrigatório; `serie`, `modelo`, `dataEmissao`, `condicaoPagamentoId`,
  `formaPagamentoId` e `aliquotaIss` opcionais. Cliente, serviços, valores e
  descontos não são redigitados nem modificados neste comando.
- `POST /api/notas-servico/{id}/emissao`: confirmação explícita de emissão
  interna, que efetivamente gera as contas. Não há autorização de NFS-e externa.

Condição e forma são selecionadas com `ReferenceSelect`, apenas com
`payments:read`. A geração requer `fiscal:manage` e `service_orders:read`.
Após preparar, o usuário pode emitir internamente no detalhe ou abrir a nota em
`/app/notas-servico?detail=ID`. Parcelas abrem `/app/contas-receber?detail=ID`.

Em timeout na geração, mantém dados e chave; 409 consulta os vínculos sem novo
POST automático. Em timeout/409 na emissão, consulta a situação antes de liberar
nova tentativa: não reenvia uma emissão financeira sem conciliação.

`ServiceOrderDocuments.test.tsx` cobre geração elegível, estados recusados,
repetição da chave, emissão explícita, parcelas, conciliação de timeout e erro de
leitura. `ServiceOrdersPage.test.tsx` cobre conclusão sem cobrança e continuidade
no mesmo detalhe. `serviceOrders.test.ts` cobre o payload mínimo e a alíquota.

## Tratamento de Erros

Cancelamento exige confirmacao visual. Pendencia de reembolso nao e apresentada
como concluida. O token QR e tratado como segredo: nao entra no workspace e so
fica visivel no resultado imediato, com copia explicita.

Falha na leitura dos documentos não é exibida como ausência de nota/contas/estoque.
Geração de nota mantém formulário e chave da intenção após timeout; a repetição
é explicitamente solicitada pelo usuário, com a mesma chave e dados. No conflito
409, consulta novamente os vínculos, sem repetir o POST automaticamente. Nota já
existente é mostrada por link. Não há envio nem autorização fiscal externa.

## Testes (curl ou equivalente)

Vitest cobre criacao de hold com payload real, isolamento e chave idempotente.

`AdministrativeSalesPage.test.tsx` cobre detalhe por URL fora da paginação,
transição sem perder contexto, leitura por permissão, troca de organização,
falha de consulta, dados adicionais da nota, timeout e conciliação de conflito.
`administrativeSales.test.ts` valida normalização da venda e payload fiscal mínimo.
`navigation.test.tsx` conserva rota/permissão com o rótulo Pedidos de venda.

## Decisoes Tecnicas

- A listagem de pedidos usa cursor e ownership do backend.
- Credenciais sem endpoint de busca sao consultadas por ID ou resposta recente.
- O token QR nao e logado nem persistido localmente.
- Holds, pedidos e credenciais sao abas independentes e somente sao montadas
  quando o principal possui a permissao contextual exigida pela operacao.
- Criar, consultar, confirmar e cancelar pedido são controles independentes;
  possuir uma dessas permissões não revela comandos das demais.
- Pedidos de venda usam `useLinkedDetail` em `?detail=ID`, inclusive abertura
  direta sem o registro estar na página corrente. A troca de organização desmonta
  o workspace anterior, sem reutilizar formulário, detalhe ou chave de intenção.
- Desktop mantém tabela e menu de ações; mobile reutiliza `ListingCards` e
  `SecondaryActionsMenu`. Confirmar/editar/cancelar também estão no detalhe.
- Geração exige `sales:read` e `fiscal:manage`; consulta a nota por
  `/app/notas-saida?detail=ID` e parcelas por `/app/contas-receber?detail=ID`.
  Não são solicitados IDs manuais nem repetidos dados comerciais.
- Preparar a nota deixa documento `PENDENTE`; não confundir com emissão externa.
- A atualização da venda utiliza a versão retornada para manter o detalhe atual;
  invalida os documentos e consultas operacionais afetadas no contexto do tenant.
- Notas de saída e de serviço exibem o vínculo persistido de origem por
  `DocumentOriginLinks`, retornando diretamente ao pedido/OS em `?detail=ID`.
  O link exige respectivamente `sales:read` ou `service_orders:read`; IDs de
  origem não são apresentados como campos técnicos no detalhe genérico.
- O vínculo opcional no formulário fiscal usa `ReferenceSelect`, com busca por
  número e filtro de estado confirmado/concluído. Os comandos fiscais exigem
  `fiscal:manage`, separados da leitura. O backend aplica `numero` e `status`
  antes da paginação em vendas e OS; a busca não é uma aproximação apenas local.
- Referências respeitam a permissão de leitura e usam cache organizacional
  mesmo sem registro de CRUD. Falhas de leitura permanecem visíveis, sem sugerir
  que o documento não existe. Cliente/fornecedor podem ser cadastrados pelo
  provider contextual existente sem sair do formulário.
- Confirmar pedido ou emitir a nota de serviço invalida também lista e resumo
  financeiro. Preparar nota invalida a listagem fiscal com sua chave real;
  nenhuma dessas atualizações cria lançamentos ou notas adicionais.

## Modulos relacionados

- [[eventos]]
- [[workspace]]
- [[acesso]]
- [[auth]]
- [[core]]
- [[estoque]]
- [[fiscal-financeiro]]

## Historico (data + acao)

| Data | Acao |
|---|---|
| 2026-08-03 | Implementa holds, pedidos, confirmacao, cancelamento, credenciais e QR. |
| 2026-08-03 | Restringe cada area comercial por permissao contextual efetiva. |
| 2026-08-03 | Separa os comandos de pedido conforme o RBAC do backend. |
| 2026-09-12 | Integra pedidos de venda a nota de saída, parcelas e razão de estoque; preserva efeitos da confirmação, RBAC, tenant e retry idempotente sem redigitar dados. |
| 2026-09-12 | Conecta OS concluída à preparação e emissão interna da nota de serviço, com parcelas, navegação por contexto e conciliação de timeout sem reenvio automático. |
| 2026-09-12 | Adiciona retorno exato nota→pedido/OS com RBAC, seletores pesquisáveis de origem e cadastros contextuais preservados; cobre invalidação fiscal/financeira e filtros reais de número/situação. |
| 2026-09-28 | Traduz estados e termos comerciais, confirma navegação pedido → nota → recebível → estoque e preserva a reserva temporária sem jargão de hold. |
