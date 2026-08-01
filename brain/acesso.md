> Links: [[core]] · [[auth]]

# Acesso de Eventos

## Objetivo

Executar check-in e check-out QR online em uma interface responsiva para o
operador, consumindo exclusivamente os contratos canônicos do backend.

## Contexto

A tela é exibida quando o JWT contextual possui `access:checkin` ou
`access:checkout`. O backend continua sendo a autoridade de autorização,
ocupação, presença, sessão e política de reentrada.

## Fluxo (camadas da arquitetura)

```text
QR + evento + pátio + faixa
  -> POST /api/v1/check-ins ou /api/v1/check-outs
  -> Idempotency-Key estável para retry do mesmo payload
  -> decisão AUTORIZADA/RECUSADA + motivo + ocupação
```

## Endpoints (se houver)

- `POST /api/v1/check-ins`
- `POST /api/v1/check-outs`

## Estrutura de Dados (DTOs, Entidades)

`AccessResponse` contém tentativa, decisão, motivo, efeitos, ocupação e estado
resultante da credencial. O QR não é copiado para estado de resultado.

## Integrações externas (se houver)

Nenhuma. Câmera, cancela e leitores físicos não são simulados.

## Tratamento de Erros

Problem Details é convertido em mensagem operacional. Recusa de negócio aparece
como resultado terminal; erro HTTP permanece alerta e reutiliza a chave no retry.

## Testes (curl ou equivalente)

Validação disponível por `npm run typecheck` e `npm run build`.

## Decisões Técnicas

- A mesma direção e payload reutilizam `Idempotency-Key` até “Nova leitura”.
- A navegação usa permissões efetivas somente para UX; a segurança real permanece
  no backend.

## Módulos relacionados

- [[core]]
- [[auth]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-01 | Implementa operação QR online responsiva para entrada e saída. |
