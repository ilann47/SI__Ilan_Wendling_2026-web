> Links: [[core]]

# Acesso de Eventos

## Objetivo

Oferecer uma interface mobile-first para check-in, check-out e bloqueio
operacional de credenciais de eventos.

## Contexto

`EventAccessPage` é visível conforme `access:checkin`, `access:checkout` ou
`credentials:block`. A tela não envia comando de cancela e não simula hardware.

## Fluxo (camadas da arquitetura)

```text
Operador informa QR + evento + pátio + faixa
  -> POST /api/v1/check-ins ou /check-outs
  -> Idempotency-Key estável durante retry do mesmo payload
  -> decisão e ocupação resultante

Supervisor informa credencial + motivo
  -> POST /api/v1/credentials/{id}/blocking
  -> estado e ETag resultantes
```

## Endpoints (se houver)

- `POST /api/v1/check-ins`
- `POST /api/v1/check-outs`
- `POST /api/v1/credentials/{credentialId}/blocking`

## Estrutura de Dados (DTOs, Entidades)

`AccessResponse` modela decisão, motivo, tentativa, efeitos e ocupação.
`CredentialResponse` modela o resultado mínimo do bloqueio.

## Integrações externas (se houver)

Nenhuma integração física. A página consome exclusivamente a API central.

## Tratamento de Erros

Falhas HTTP usam `describeError`; recusas de negócio de acesso são exibidas
como decisões válidas. O bloqueio mantém erro e resultado em estados separados.

## Testes (curl ou equivalente)

- `npm run typecheck`
- `npm run build`

## Decisões Técnicas

- O QR é campo de senha, não é persistido no navegador pela página.
- Retry do mesmo acesso reutiliza a chave idempotente; mudança de payload cria
  nova chave.
- Bloqueio exige motivo localmente e continua protegido pelo RBAC do backend.

## Módulos relacionados

- [[core]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-01 | Documenta check-in/check-out QR e bloqueio operacional por Supervisor. |
