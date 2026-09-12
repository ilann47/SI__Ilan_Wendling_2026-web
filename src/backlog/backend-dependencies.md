# Dependências de backend — frontend backlog

Registro honesto de relações/contratos que o frontend precisa e ainda não
encontram endpoint estável. Não inventar mocks para esconder estas lacunas.

## Nota de Entrada

| Necessidade UX | Situação atual | Dependência sugerida |
|---|---|---|
| Vínculo OC + recebimento no detalhe da nota | Resolvido por `GET /api/notas-entrada/{id}/detalhes` | Integrado no detalhe dedicado |
| Contas a pagar geradas pela confirmação | Resolvido pelo array `contasPagar` do detalhe integrado | Integrado; deep-link usa `notaEntradaId` |
| Movimentos de estoque da confirmação | Resolvido pelo array `movimentosEstoque` do detalhe integrado | Integrado no detalhe dedicado |
| Histórico de ações (criar/confirmar/cancelar) | Sem auditoria por recurso na API atual | Eventos/auditoria por `notaEntradaId` |
| Lista global de recebimentos | Só `GET /api/v1/purchase-orders/{id}/receipts` | Opcional: listagem paginada de recebimentos; UI atual compõe via OC |

## Navegação / Estoque

Recebimentos e Nota de Entrada migraram para a área Estoque (processo Compras).
Nenhuma mudança de contrato exigida para a navegação.

## Home, pendências e execução — 2026-09-12

| Necessidade UX | Evidência/limite atual | Tratamento nesta entrega |
|---|---|---|
| Total completo de compras aguardando recebimento e serviços abertos | `OrdemCompraController.listar` e `OrdemServicoController.listar` aceitam somente `Pageable`; não há filtro de situação nem agregação de pendências | A home identifica a amostra e não apresenta zero como total global. Links individuais usam o GET por ID existente. Backend precisa fornecer contadores e listagens filtradas antes de prometer cobertura integral |
| Lista financeira filtrada por situação, fornecedor ou vencimento | `ContaPagarController.listar` e `ContaReceberController.listar` recebem somente `Pageable`; filtros presentes no frontend não são aplicados por esses métodos | Nenhum novo atalho depende desses filtros. Indicadores abrem os títulos reais do relatório por período; cada título abre seu GET por ID |
| Total de vencidas de todo o histórico | `RelatorioService.contasAVencer` consulta títulos abertos com vencimento entre início/fim e calcula vencidas apenas nesse conjunto | Período explícito (hoje, sete datas incluindo hoje, mês corrente). Não buscar desde uma data histórica arbitrária; agregar todas as vencidas depende de contrato backend |
| Ligar OS concluída à nota e conta correspondentes | `ServiceOrder` não traz os IDs desses documentos | Ações Iniciar/Concluir seguem estado e RBAC; não é inventado atalho de faturamento nem vínculo de documento |

Não foram alterados backend, migrations ou contratos. O relatório de estoque
mínimo já retorna a relação completa e é aberto diretamente em sua aba existente.
