> Links: [[core]] · [[auth]] · [[estoque]] · [[conveniencia]] · [[fornecedores]] · [[pagamentos]] · [[paridade-api]] · [[listagens]]

# Fiscal e Financeiro de Entrada

## Objetivo
Operar notas de entrada/saída e contas a pagar/receber na organização ativa.

## Contexto
As telas legadas foram conectadas aos contratos tenant-aware da V55+.
Nota de Entrada saiu do CRUD genérico: lista, wizard guiado e detalhe próprios
no menu Estoque (processo Compras). Saída e serviço ficam em Vendas, sem área
Fiscal separada. Contas continuam no menu Financeiro.

## Fluxo (camadas da arquitetura)
```text
Menu superior Estoque -> Compras (sem página intermediária)
  -> /app/notas-entrada (lista)
  -> /app/notas-entrada/nova (wizard)
  -> /app/notas-entrada/:id (detalhe)
Confirmar: POST /api/notas-entrada/{id}/confirmacao
```

## Endpoints (se houver)
- `/api/notas-entrada`
- `/api/notas-entrada/{id}/confirmacao`
- `/api/notas-entrada/{id}/cancelamento`
- `/api/notas-entrada/{id}/detalhes` (nota + origem + contas + movimentos)
- `/api/contas-pagar`
- `/api/v1/stock-locations`
- `/api/v1/purchase-orders/{id}/receipts` (origem do wizard)

## Estrutura de Dados (DTOs, Entidades)
Nota envia `localEstoqueId` e opcionalmente `recebimentoCompraId`.
Resposta de listagem inclui fornecedor, local, totais, itens e situação.
O detalhe integrado inclui a referência da OC, recebimento, contas a pagar e
movimentos de estoque. Histórico de ações permanece indisponível
(ver `src/backlog/backend-dependencies.md`).

## Integrações externas (se houver)
Nenhuma.

## Tratamento de Erros
Menus e ações respeitam `fiscal:*` e `finance:*`.
Wizard exige também `suppliers:read`, `catalog:read` e `stock:read` para criar.

## Testes (curl ou equivalente)
Vitest cobre payload (`inboundNotes.test.ts`), navegação de áreas e gates.

## Decisões Técnicas
- Wizard: origem manual ou recebimento de OC; sem digitar IDs.
- Salvar rascunho = POST create; Confirmar = create + confirmacao (ou ação na lista/detalhe).
- Saída e serviço permanecem em CRUD genérico no menu Vendas, com URLs e RBAC preservados.
- A listagem de notas de entrada mantém a trilha de compras, sem uma segunda
  linha de botões repetindo OC, recebimentos e contas a pagar.
- O detalhe usa o contrato composto para manter a listagem leve e apresentar o
  encadeamento operacional sem consultas por IDs digitados.
- Pendências e indicadores abrem a conta real via `?detail=ID`; despesas avulsas
  seguem rota própria. Baixa/cancelamento exigem `finance:manage` na interface,
  inclusive quando o detalhe é aberto por URL. Somente leitura não exibe comandos.
- O relatório financeiro é delimitado por vencimento; a home mostra pagar e
  receber separados, com as datas explícitas. Filtros globais/histórico completo
  ainda dependem dos contratos registrados no backlog, sem simular cobertura total.

## Módulos relacionados
[[estoque]], [[conveniencia]], [[fornecedores]], [[pagamentos]], [[paridade-api]], [[listagens]].

## Histórico (data + ação)
| Data | Ação |
|---|---|
| 2026-08-04 | Integração frontend V55 concluída. |
| 2026-08-04 | Integração frontend V56 concluída. |
| 2026-08-04 | Integração frontend de Nota de Serviço V57 concluída. |
| 2026-09-11 | Nota de Entrada dedicada (lista/wizard/detalhe) + área Estoque. |
| 2026-09-11 | Trilha Compras (OC→Receber→Nota→Pagar) + mega menus em todas as áreas. |
| 2026-09-11 | Detalhe integrado da nota, resumo sticky e revisão operacional do wizard. |
| 2026-09-11 | Reúne documentos nos menus de Compras/Vendas e remove atalhos duplicados da listagem de entrada. |
| 2026-09-12 | Conecta títulos do resumo a detalhes por ID e restringe comandos a finance:manage; separa fluxos financeiros por período. |
