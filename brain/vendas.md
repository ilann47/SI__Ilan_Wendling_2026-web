> Links: [[core]] · [[auth]] · [[workspace]] · [[eventos]] · [[acesso]]

# Vendas de mercadorias, eventos e serviços

## Objetivo

Operar o funil real de reserva temporaria, pedido, confirmacao/cancelamento e
emissao de credenciais de acesso.

Na operação comercial de mercadorias, usar **Vendas → Notas de Saída** sem
pedido intermediário. A interface de Pedidos de Venda de mercadorias foi
retirada. Pedidos de ingressos de eventos e Ordens de Serviço são fluxos distintos.

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
Nova Nota de Saída -> conferir rascunho -> confirmar (baixa estoque + gera recebíveis)
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
- Para venda de mercadorias: `POST /api/notas-saida` e conferência em
  `GET /api/notas-saida/{id}/detalhes`; consulte [[fiscal-financeiro]].

## Estrutura de Dados (DTOs, Entidades)

As telas refletem ReservaInventario, Pedido/ItemPedido, CancelamentoPedido,
CredencialAcesso e RepresentacaoQr. Chaves idempotentes sao novas por intencao;
If-Match usa a versao consultada ou retornada.

O contrato de Nota de Saída não possui vínculo com Pedido de Venda. Seu
detalhe apresenta os títulos e movimentos vinculados à própria nota.

## Integracoes externas (se houver)

Pagamento e reembolso externos permanecem bloqueados conforme a matriz oficial.

## Ordens de serviço no fluxo comercial

`ServiceOrdersPage` mantém execução `RASCUNHO -> EM_EXECUCAO -> CONCLUIDA` sem
gerar cobrança na conclusão. O detalhe fica aberto após transições, permite
preparar a nota a partir da ordem concluída e consultar seus recebíveis.
Quantidades fracionárias, valores e descontos aceitam até seis casas, inclusive
a alíquota ao preparar a Nota de Serviço. A conferência preserva as frações
registradas no serviço, ISS, parcelas e recebimentos. Lotes e pedidos de eventos
também exibem os preços até a sexta casa, sem converter cotas em frações.

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
O tratamento de criação e confirmação da Nota de Saída está em [[fiscal-financeiro]].

## Testes (curl ou equivalente)

Vitest cobre criacao de hold com payload real, isolamento e chave idempotente.

`App.test.tsx` e `navigation.test.tsx` cobrem a retirada da rota e dos menus
de Pedido de Venda e a ação para a Nota de Saída. `OutboundNoteDocumentPage.test.tsx`
cobre conferência, reversão e links para os títulos e movimentos da nota.

## Decisoes Tecnicas

- A listagem de pedidos usa cursor e ownership do backend.
- Credenciais sem endpoint de busca sao consultadas por ID ou resposta recente.
- O token QR nao e logado nem persistido localmente.
- Holds, pedidos e credenciais sao abas independentes e somente sao montadas
  quando o principal possui a permissao contextual exigida pela operacao.
- Criar, consultar, confirmar e cancelar pedido são controles independentes;
  possuir uma dessas permissões não revela comandos das demais.
- A antiga rota de Pedido de Venda cai na home. Links persistidos em favoritos
  ou recentes são filtrados para não oferecer atalhos quebrados.
- A OS concluída prepara a Nota de Serviço e encaminha para sua conferência
  dedicada, sem emitir diretamente no painel da ordem. A nota mantém o link
  de volta à OS com `service_orders:read`; comandos exigem `fiscal:manage`.
- Referências respeitam a permissão de leitura e usam cache organizacional
  mesmo sem registro de CRUD. Falhas de leitura permanecem visíveis, sem sugerir
  que o documento não existe. Cliente/fornecedor podem ser cadastrados pelo
  provider contextual existente sem sair do formulário.
- Confirmar Nota de Saída ou emitir a nota de serviço invalida também lista e resumo
  financeiro. Preparar nota invalida a listagem fiscal com sua chave real;
  nenhuma dessas atualizações cria lançamentos ou notas adicionais.
- Quantidade da reserva, filtros e versoes operacionais usam validacao numerica
  comum, com limites visiveis e normalizacao de zeros a esquerda.
- Produto, reserva, pedido e credencial priorizam seleção pela referência
  recente; o código interno fica como contingência quando não há catálogo.

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
| 2026-11-08 | Valida e apresenta seis casas nos serviços, ISS e preços de eventos. |
| 2026-11-05 | Retira a operação de Pedido de Venda de mercadorias e mantém Nota de Saída avulsa como o único novo fluxo; preserva histórico e pedidos de eventos. |
| 2026-11-05 | Alinha o frontend à retirada completa do vínculo de Pedido de Venda; preserva os fluxos de eventos e ordens de serviço. |
| 2026-10-24 | QA redesenha referências de reserva/pedido/credencial e oculta IDs/versões dos resumos confirmados. |
| 2026-08-03 | Implementa holds, pedidos, confirmacao, cancelamento, credenciais e QR. |
| 2026-08-03 | Restringe cada area comercial por permissao contextual efetiva. |
| 2026-08-03 | Separa os comandos de pedido conforme o RBAC do backend. |
| 2026-09-12 | Integra pedidos de venda a nota de saída, parcelas e razão de estoque; preserva efeitos da confirmação, RBAC, tenant e retry idempotente sem redigitar dados. |
| 2026-09-12 | Conecta OS concluída à preparação e emissão interna da nota de serviço, com parcelas, navegação por contexto e conciliação de timeout sem reenvio automático. |
| 2026-11-06 | Retira emissão sem conferência do painel da OS e direciona à Nota de Serviço detalhada. |
| 2026-09-12 | Adiciona retorno exato nota→pedido/OS com RBAC, seletores pesquisáveis de origem e cadastros contextuais preservados; cobre invalidação fiscal/financeira e filtros reais de número/situação. |
| 2026-09-28 | Traduz estados e termos comerciais, confirma navegação pedido → nota → recebível → estoque e preserva a reserva temporária sem jargão de hold. |
| 2026-09-29 | Padroniza quantidade, filtro de evento e versões numéricas nos fluxos de venda. |
