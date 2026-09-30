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

Os testes de criação e alteração de política simulam e verificam o GET de
atualização do catálogo após a mutação. Não dependem de um backend acessível
durante o Vitest. Esta manutenção de testes não altera o comportamento da tela.

## Decisoes Tecnicas

- Disponibilidade nao e apresentada como garantia; somente hold garante estoque.
- Encerramento operacional reconhece explicitamente a pendencia financeira externa.
- Direito da fase atual e somente `ESTACIONAMENTO_EVENTO`.
- A consulta de disponibilidade permanece visivel a qualquer Membership ativa;
  configuracao, publicacao, precificacao, inventario e operacao aparecem somente
  quando a permissao contextual correspondente esta presente.
- Selecionar uma alocacao real preenche evento, janela de acesso e quota vendavel
  do produto a partir da resposta da API, evitando divergencia temporal local.
- Evento legado sem politica explicita e carregado com `ENTRADA_UNICA` como
  proposta visivel; o valor somente passa a valer depois do PATCH confirmado.
- Eventos, alocacoes, produtos e lotes usam cards operacionais no mobile e
  preservam tabelas no desktop; as abas permitem rolagem e botoes de navegacao
  em telas estreitas sem esconder etapas.

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
| 2026-08-03 | Alinha abas e acoes as permissoes contextuais do backend. |
| 2026-08-03 | Herda periodo e quota da alocacao ao configurar produto. |
| 2026-08-03 | Impede envio nulo ao definir politica em evento legado. |
| 2026-09-12 | Completa mocks e assertivas da atualização do catálogo após criar/alterar evento, evitando rede real durante os testes. |
| 2026-09-28 | Valida evento, alocação, produto, lote e disponibilidade no navegador e apresenta categoria, preço e estados em linguagem operacional. |
| 2026-09-29 | Adapta catalogos e etapas de eventos ao mobile com cards, rotulos acessiveis e abas rolaveis. |
