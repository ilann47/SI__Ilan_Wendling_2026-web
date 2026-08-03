> Links: [[core]] · [[auth]] · [[workspace]] · [[eventos]]

# Instalacoes

## Objetivo

Cadastrar locais, patios, setores e vagas que suportam a operacao fisica dos eventos.

## Contexto

Os endpoints atuais sao somente de criacao. A UI encadeia respostas reais pelo
[[workspace]] do tenant e aceita IDs conhecidos quando a referencia nao foi criada
na sessao atual.

## Fluxo (camadas da arquitetura)

```text
Venue -> Patio -> Setor -> importacao batch de Vagas
formulario -> /api/v1 -> resposta/207 parcial -> workspace tenant-aware
```

## Endpoints (se houver)

- `POST /api/v1/venues`
- `POST /api/v1/parking-facilities`
- `POST /api/v1/parking-facilities/{id}/sectors`
- `POST /api/v1/sectors/{id}/spaces:batch`

## Estrutura de Dados (DTOs, Entidades)

Os formularios refletem os DTOs de Venue, PatioInstalacao, Setor e Vaga. O lote
de vagas usa o formato por linha `codigo;categoria;acessivel;posicao` e converte
para `spaces[]` antes da chamada.

## Integracoes externas (se houver)

Nenhuma. `cityId` referencia o cadastro geografico legado existente.

## Tratamento de Erros

Problem Details sao exibidos no painel. Resultado HTTP 207 apresenta os totais
criados, existentes e conflitantes sem declarar o lote inteiro como sucesso.

## Testes (curl ou equivalente)

Vitest cobre conversao do lote e rejeicao de categorias fora do catalogo.

## Decisoes Tecnicas

- Capacidades fisica e operacional permanecem campos distintos.
- Categorias seguem exatamente o enum do backend.
- Nenhuma listagem inexistente e simulada.

## Modulos relacionados

- [[workspace]]
- [[eventos]]
- [[auth]]
- [[core]]

## Historico (data + acao)

| Data | Acao |
|---|---|
| 2026-08-03 | Implementa fluxo completo de criacao da estrutura fisica. |
