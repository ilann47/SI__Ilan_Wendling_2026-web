> Links: [[core]] · [[auth]]

# Acesso de Eventos

## Objetivo

Oferecer uma interface mobile-first para validação sem consumo, check-in,
check-out e bloqueio operacional de credenciais de eventos.

## Contexto

`EventAccessPage` é visível conforme `access:validate`, `access:checkin`,
`access:checkout` ou `credentials:block`. O backend continua sendo a autoridade de autorização,
ocupação, presença, sessão, política de reentrada e RBAC. A tela não envia
comando de cancela e não simula hardware.

## Fluxo (camadas da arquitetura)

```text
Operador informa QR + evento + pátio + faixa
  -> POST /api/v1/access-validations, /check-ins ou /check-outs
  -> Idempotency-Key estável durante retry do mesmo payload
  -> decisão sem consumo ou ocupação resultante

Supervisor informa credencial + motivo
  -> POST /api/v1/credentials/{id}/blocking
  -> estado e ETag resultantes
```

## Endpoints (se houver)

- `POST /api/v1/access-validations`
- `POST /api/v1/check-ins`
- `POST /api/v1/check-outs`
- `POST /api/v1/credentials/{credentialId}/blocking`

## Estrutura de Dados (DTOs, Entidades)

`AccessResponse` modela decisão, motivo, tentativa, consumo, efeitos e ocupação.
`CredentialResponse` modela o resultado mínimo do bloqueio.

## Integrações externas (se houver)

Nenhuma integração física. A página consome exclusivamente a API central.

## Tratamento de Erros

Falhas HTTP usam `describeError`; recusas de negócio de acesso são exibidas
como decisões válidas e o retry reutiliza a chave idempotente. O bloqueio mantém
erro e resultado em estados separados.

## Testes (curl ou equivalente)

- `npm run typecheck`
- `npm run build`

## Decisões Técnicas

- O QR é campo de senha, não é persistido no navegador pela página.
- Retry do mesmo acesso reutiliza a chave idempotente; mudança de payload cria
  nova chave.
- A validação usa o mesmo formulário e deixa explícito que não consome o
  direito nem solicita abertura de barreira.
- Bloqueio exige motivo localmente e continua protegido pelo RBAC do backend.
- A navegação por permissão é somente UX; o backend permanece a barreira de
  segurança.

## Módulos relacionados

- [[core]]
- [[auth]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-01 | Implementa operação QR online responsiva para entrada e saída. |
| 2026-08-01 | Adiciona bloqueio operacional de credencial por Supervisor. |
| 2026-08-01 | Adiciona validação QR auditável sem consumo ao console operacional. |
