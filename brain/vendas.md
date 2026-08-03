> Links: [[core]] · [[auth]] · [[workspace]] · [[eventos]] · [[acesso]]

# Vendas e Credenciais

## Objetivo

Operar o funil real de reserva temporaria, pedido, confirmacao/cancelamento e
emissao de credenciais de acesso.

## Contexto

Disponibilidade nao reserva estoque. A interface cria um hold idempotente, usa o
hold no pedido e permite confirmacao manual somente quando autorizada. Listagem
de pedidos e sempre limitada ao ator autenticado pelo backend.

## Fluxo (camadas da arquitetura)

```text
Disponibilidade -> Hold -> Pedido -> Confirmacao -> Credencial -> Token QR
                         \-> Cancelamento -> liberacao/bloqueio/reembolso pendente
```

## Endpoints (se houver)

- `POST/GET /api/v1/inventory-holds`
- `POST /api/v1/inventory-holds/{id}/release`
- `POST/GET /api/v1/orders`
- `POST /api/v1/orders/{id}/manual-confirmation|cancellation`
- `POST /api/v1/orders/{id}/credentials`
- `GET /api/v1/credentials/{id}`
- `POST /api/v1/credentials/{id}/qr-code`

## Estrutura de Dados (DTOs, Entidades)

As telas refletem ReservaInventario, Pedido/ItemPedido, CancelamentoPedido,
CredencialAcesso e RepresentacaoQr. Chaves idempotentes sao novas por intencao;
If-Match usa a versao consultada ou retornada.

## Integracoes externas (se houver)

Pagamento e reembolso externos permanecem bloqueados conforme a matriz oficial.

## Tratamento de Erros

Cancelamento exige confirmacao visual. Pendencia de reembolso nao e apresentada
como concluida. O token QR e tratado como segredo: nao entra no workspace e so
fica visivel no resultado imediato, com copia explicita.

## Testes (curl ou equivalente)

Vitest cobre criacao de hold com payload real, isolamento e chave idempotente.

## Decisoes Tecnicas

- A listagem de pedidos usa cursor e ownership do backend.
- Credenciais sem endpoint de busca sao consultadas por ID ou resposta recente.
- O token QR nao e logado nem persistido localmente.
- Holds, pedidos e credenciais sao abas independentes e somente sao montadas
  quando o principal possui a permissao contextual exigida pela operacao.

## Modulos relacionados

- [[eventos]]
- [[workspace]]
- [[acesso]]
- [[auth]]
- [[core]]

## Historico (data + acao)

| Data | Acao |
|---|---|
| 2026-08-03 | Implementa holds, pedidos, confirmacao, cancelamento, credenciais e QR. |
| 2026-08-03 | Restringe cada area comercial por permissao contextual efetiva. |
