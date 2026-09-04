> Links: [[core]] · [[auth]] · [[workspace]] · [[listagens]] · [[eventos]] · [[acesso]]

# Dashboard Operacional

## Objetivo

Consolidar pendências e atividades reais do tenant ativo.

## Contexto

O painel usa apenas contratos existentes: pátio, contas a vencer, estoque
mínimo, eventos, tentativas de acesso e as últimas páginas de ordens e vendas.
Quando a agregação não cabe em uma única página, a UI declara o recorte.

## Fluxo (camadas da arquitetura)

```text
permissoes -> relatorios/listagens existentes -> KPIs e atalhos
```

## Endpoints (se houver)

- `GET /api/relatorios/patio`
- `GET /api/relatorios/contas-a-vencer`
- `GET /api/relatorios/estoque-minimo`
- `GET /api/v1/events`
- `GET /api/v1/access-attempts`
- `GET /api/v1/purchase-orders`
- `GET /api/v1/administrative-sales`
- `GET /api/v1/service-orders`

## Estrutura de Dados (DTOs, Entidades)

O dashboard usa apenas totais presentes nas respostas e decisoes dos ultimos 20
itens. Nao estima ocupacao, receita ou vendas sem contrato correspondente.

## Integracoes externas (se houver)

Nenhuma.

## Tratamento de Erros

Falha de qualquer leitura apresenta Problem Details. Ausencia de evento mostra
CTA de configuracao, sem zeros ficticios.

## Testes (curl ou equivalente)

Vitest comprova que disponibilidade e decisoes exibidas vieram das APIs reais.

## Decisoes Tecnicas

- Refetch somente para consultas operacionais ativas.
- Atalhos seguem permissoes efetivas.
- Hold continua sendo a unica garantia de inventario.

## Modulos relacionados

- [[workspace]]
- [[listagens]]
- [[eventos]]
- [[acesso]]
- [[auth]]
- [[core]]

## Historico (data + acao)

| Data | Acao |
|---|---|
| 2026-08-03 | Substitui landing estatica por painel operacional com dados reais. |
| 2026-09-04 | Amplia o painel com pátio, vencimentos, estoque mínimo e pendências comerciais reais. |
