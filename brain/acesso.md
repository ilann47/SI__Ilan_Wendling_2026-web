> Links: [[core]] · [[auth]] · [[workspace]] · [[eventos]] · [[vendas]]

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
Operador le QR pela camera (quando suportado) ou informa token + evento + patio + faixa
  -> POST /api/v1/access-validations, /check-ins ou /check-outs
  -> Idempotency-Key estável durante retry do mesmo payload
  -> decisão sem consumo ou ocupação resultante

Supervisor informa credencial + motivo
  -> POST /api/v1/credentials/{id}/blocking
  -> estado e ETag resultantes

Administrador/Gestor filtra o feed por evento, decisão e motivo
  -> GET /api/v1/access-attempts com cursor keyset
  -> tentativas do tenant ativo sem token/hash QR
```

## Endpoints (se houver)

- `POST /api/v1/access-validations`
- `POST /api/v1/check-ins`
- `POST /api/v1/check-outs`
- `POST /api/v1/credentials/{credentialId}/blocking`
- `GET /api/v1/access-attempts`

## Estrutura de Dados (DTOs, Entidades)

`AccessResponse` modela decisão, motivo, tentativa, consumo, efeitos e ocupação.
`CredentialResponse` modela o resultado mínimo do bloqueio.
`AccessAttemptPage` representa a página keyset e nunca contém o segredo lido.

## Integrações externas (se houver)

Nenhuma integração física. A página consome exclusivamente a API central.

## Tratamento de Erros

Falhas HTTP usam `describeError`; recusas de negócio de acesso são exibidas
como decisões válidas e o retry reutiliza a chave idempotente. O bloqueio mantém
erro e resultado em estados separados e exige confirmacao destrutiva. Codigos de
motivo sao traduzidos sem perder o valor tecnico no contrato.

## Testes (curl ou equivalente)

- `npm test -- src/pages/EventAccessPage.test.tsx`
- `npm run typecheck`
- `npm run build`

## Decisões Técnicas

- O QR é campo de senha, não é persistido no navegador pela página.
- A camera usa `BarcodeDetector` e `getUserMedia` nativos; navegadores sem suporte
  mantem entrada manual, sem upload de imagem ou integracao externa.
- Retry do mesmo acesso reutiliza a chave idempotente; mudança de payload cria
  nova chave.
- A validação usa o mesmo formulário e deixa explícito que não consome o
  direito nem solicita abertura de barreira.
- Bloqueio exige motivo localmente e continua protegido pelo RBAC do backend.
- A navegação por permissão é somente UX; o backend permanece a barreira de
  segurança.
- O feed aparece somente com `audit:read`, usa filtros aplicados explicitamente
  e mantém o histórico local de cursores para navegação anterior/próxima.
- O console mantem as ultimas dez decisoes somente em memoria durante a sessao.

## Módulos relacionados

- [[core]]
- [[auth]]
- [[workspace]]
- [[eventos]]
- [[vendas]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-01 | Implementa operação QR online responsiva para entrada e saída. |
| 2026-08-01 | Adiciona bloqueio operacional de credencial por Supervisor. |
| 2026-08-01 | Adiciona validação QR auditável sem consumo ao console operacional. |
| 2026-08-01 | Adiciona feed paginado e filtrável de tentativas para auditoria. |
| 2026-08-03 | Adiciona leitura nativa por camera, referencias recentes, confirmacao e historico da sessao. |
