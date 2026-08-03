> Links: [[core]] · [[auth]] · [[workspace]] · [[instalacoes]] · [[vendas]] · [[acesso]]

# Eventos e Ofertas

## Objetivo

Operar o nucleo configuravel de eventos: evento, alocacao de patio, produto,
lote de preco, publicacao e disponibilidade.

## Contexto

Os agregados nao possuem endpoints de listagem ou leitura individual. A UI usa
snapshots reais do [[workspace]] e permite informar ID/versao conhecidos. Todas
as escritas versionadas enviam `If-Match`; criacoes geram chave idempotente.

## Fluxo (camadas da arquitetura)

```text
Venue + Evento
  -> Alocacao Evento-Patio
  -> Produto de Estacionamento
  -> Lote de Preco
  -> Publicacao / abertura de vendas
  -> Disponibilidade
```

## Endpoints (se houver)

- `POST/PATCH /api/v1/events`
- `POST /api/v1/events/{id}/publication|sales-opening|sales-closing|operation-start|operation-closing`
- `POST /api/v1/events/{id}/parking-allocations`
- `PATCH /api/v1/parking-allocations/{id}`
- `POST /api/v1/events/{id}/parking-products`
- `POST /api/v1/parking-products/{id}/publication`
- `POST /api/v1/parking-products/{id}/price-tiers`
- `GET /api/v1/events/{id}/availability`

## Estrutura de Dados (DTOs, Entidades)

Formularios seguem `EventoResponse`, `AlocacaoPatioEventoResponse`,
`ProdutoEstacionamentoResponse`, `LotePrecoResponse` e
`DisponibilidadeEventoResponse`. Datas `datetime-local` sao convertidas para
instantes ISO antes do envio.

## Integracoes externas (se houver)

Nenhuma nesta fase.

## Tratamento de Erros

Transicoes invalidas, checklist incompleto, conflitos de capacidade e versoes
divergentes permanecem regras do backend e sao exibidos via Problem Details.

## Testes (curl ou equivalente)

Vitest cobre conversao temporal e criacao idempotente de evento.

## Decisoes Tecnicas

- Disponibilidade nao e apresentada como garantia; somente hold garante estoque.
- Encerramento operacional reconhece explicitamente a pendencia financeira externa.
- Direito da fase atual e somente `ESTACIONAMENTO_EVENTO`.

## Modulos relacionados

- [[instalacoes]]
- [[workspace]]
- [[vendas]]
- [[acesso]]
- [[auth]]

## Historico (data + acao)

| Data | Acao |
|---|---|
| 2026-08-03 | Implementa configuracao, ciclo de vida, oferta e disponibilidade. |
