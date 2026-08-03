> Links: [[core]] · [[auth]] · [[eventos]] · [[vendas]] · [[acesso]]

# Bloqueios

## Objetivo

Explicar capacidades indisponiveis sem oferecer operacoes que o backend nao
consegue concluir com seguranca.

## Contexto

A fonte oficial e `../docs/especificacao/bloqueios-externos.md`. A interface usa
uma projecao estatica versionada dos 13 itens porque nao existe endpoint para o
registro. Ela nao representa estado remoto nem configuracao de provider.

## Fluxo (camadas da arquitetura)

```text
registro oficial -> projecao versionada -> busca/filtro -> aviso informativo
```

## Endpoints (se houver)

Nenhum.

## Estrutura de Dados (DTOs, Entidades)

`ProductBlocker` contem ID, historia, status, tipo, dependencia, parte concluida,
parte pendente, condicao de retomada, impacto e modulos afetados.

## Integracoes externas (se houver)

Nenhuma. As integracoes ausentes sao parte do conteudo explicado.

## Tratamento de Erros

A tela nao executa comandos. Filtro sem resultado apresenta empty state util.

## Testes (curl ou equivalente)

Vitest valida os 13 IDs unicos, ausencia de botoes e filtragem local.

## Decisoes Tecnicas

- `BlockedFeatureNotice` padroniza motivo, dependencia, impacto e retomada.
- A rota exige `organizations:admin` ou `audit:read`.
- Nenhum segredo, credencial ou comportamento externo e simulado.

## Modulos relacionados

- [[core]]
- [[auth]]
- [[eventos]]
- [[vendas]]
- [[acesso]]

## Historico (data + acao)

| Data | Acao |
|---|---|
| 2026-08-03 | Implementa catalogo administrativo dos bloqueios oficiais. |
