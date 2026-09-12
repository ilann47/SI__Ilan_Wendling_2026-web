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
```

## Endpoints (se houver)

- `GET /api/v1/stock-positions`: posição por produto e filtro abaixo do mínimo.
- `GET /api/v1/stock-balances`: saldos por produto/local.
- `GET /api/v1/stock-movements[/{id}]`: razão e detalhe append-only.
- `GET/POST /api/v1/stock-locations` e `GET/PUT/DELETE .../{id}`: locais.
- `POST /api/v1/stock-adjustments`: ajuste com `Idempotency-Key`.
- `POST /api/v1/stock-movements/{id}/compensation`: compensação com chave e motivo.
- `GET/POST /api/v1/purchase-orders` e recebimentos por ordem.
- `GET/POST /api/notas-entrada` (+ `/confirmacao`, `/cancelamento`).
## Estrutura de Dados (DTOs, Entidades)

Posição usa `produtoId`, `produto`, `quantidade`, `quantidadeMinima` e
`abaixoMinimo`. Saldo acrescenta local e versão. Movimento expõe nomes, tipo,
delta, saldos anterior/posterior, custo, origem, ator, motivo e instante. Local
envia somente `nome` e `ativo`. Ajuste envia somente `produtoId`,
`localEstoqueId`, `delta`, `custoUnitario` opcional e `motivo`.

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

## Decisões Técnicas

- A listagem funciona somente com `stock:read` porque respostas incluem nomes.
- Ajuste é ocultado sem `catalog:read`; compensação não depende desse lookup.
- Razão é append-only e não reutiliza `/api/movimentacoes`.
- Notas e relatório de estoque mínimo continuam em compatibilidade global.
- Nenhum tenant, nome derivado, ID do recurso ou versão integra payload mutável.
- Mega menu da área Estoque agrupa Compras e posição; tabs via query string.
- Pendência de compra abre o GET da OC por `?detail=ID`, mesmo fora da página
  atual. O detalhe oferece Aprovar/Receber conforme estado e `purchases:manage`.
- Pendência de estoque mínimo abre a aba existente do relatório diretamente;
  erro/carregamento não é exibido como estoque saudável.

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
| 2026-08-03 | Integra posição, razão, locais, ajustes e compensações V54. |
| 2026-09-11 | Área Estoque com mega menu por processo e deep-links de abas. |
| 2026-09-11 | Mega menus em todas as áreas + trilha de processo Compras. |
| 2026-09-11 | Remove passagem pela home da área; processos abrem direto pelo topo, sem sidebar/abas nem atalhos repetidos na listagem de notas. |
| 2026-09-11 | Ações do dia na área Estoque e CTA pós-recebimento para lançar a nota. |
| 2026-09-12 | Conecta pendências a compras específicas e à relação de estoque mínimo; mantém ações operacionais no detalhe. |
