> Links: [[core]] · [[auth]] · [[estoque]] · [[conveniencia]] · [[fornecedores]] · [[pagamentos]] · [[paridade-api]]

# Fiscal e Financeiro de Entrada

## Objetivo
Operar notas de entrada/saída e contas a pagar/receber na organização ativa.

## Contexto
As telas legadas foram conectadas aos contratos tenant-aware da V55.

## Fluxo (camadas da arquitetura)
Query keys incluem a organização. A nota exige local, fornecedor e produtos contextuais.

## Endpoints (se houver)
- `/api/notas-entrada`
- `/api/contas-pagar`
- `/api/v1/stock-locations`

## Estrutura de Dados (DTOs, Entidades)
Nota envia `localEstoqueId`; resposta inclui owner, versão e local.

## Integrações externas (se houver)
Nenhuma.

## Tratamento de Erros
Menus e ações respeitam `fiscal:*` e `finance:*`.

## Testes (curl ou equivalente)
Vitest, typecheck, lint e build validam a integração.

## Decisões Técnicas
Saída e serviço permanecem na próxima fatia fiscal.

## Módulos relacionados
[[estoque]], [[conveniencia]], [[fornecedores]], [[pagamentos]], [[paridade-api]].

## Histórico (data + ação)
| Data | Ação |
|---|---|
| 2026-08-04 | Integração frontend V55 concluída. |
| 2026-08-04 | Integração frontend V56 concluída. |
| 2026-08-04 | Integração frontend de Nota de Serviço V57 concluída. |
