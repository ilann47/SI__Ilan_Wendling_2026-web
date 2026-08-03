> Links: [[core]] · [[auth]] · [[workspace]] · [[eventos]] · [[acesso]]

# Dashboard Operacional

## Objetivo

Consolidar disponibilidade e decisoes de acesso reais para um evento selecionado.

## Contexto

Como o backend nao possui endpoint agregado de dashboard nem lista eventos, o
painel seleciona referencias reais do [[workspace]] e consulta diretamente
disponibilidade e o feed de tentativas. Contagens locais sao rotuladas como
referencias deste navegador, nao como indicadores globais.

## Fluxo (camadas da arquitetura)

```text
evento recente -> GET availability (30 s)
audit:read     -> GET access-attempts limit 20 (20 s)
respostas      -> KPIs e atalhos por permissao
```

## Endpoints (se houver)

- `GET /api/v1/events/{eventId}/availability`
- `GET /api/v1/access-attempts`

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
- [[eventos]]
- [[acesso]]
- [[auth]]
- [[core]]

## Historico (data + acao)

| Data | Acao |
|---|---|
| 2026-08-03 | Substitui landing estatica por painel operacional com dados reais. |
