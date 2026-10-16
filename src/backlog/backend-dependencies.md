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
| Notas e contas no contexto da compra | Resolvido por `GET /api/v1/purchase-orders/{id}/documents` | Integrado no detalhe da OC; seções respeitam RBAC e links abrem registros exatos |
| Reenvio de criação após timeout | Resolvido por `Idempotency-Key` opcional em `POST /api/notas-entrada` | Wizard mantém a chave; confirmação recupera situação via GET sem novo POST automático |

## Navegação / Estoque

Recebimentos e Nota de Entrada migraram para a área Estoque (processo Compras).
Nenhuma mudança de contrato exigida para a navegação.

## Home, pendências e execução — 2026-09-12

| Necessidade UX | Evidência/limite atual | Tratamento nesta entrega |
|---|---|---|
| Total completo das pendências operacionais | Resolvido por `GET /api/v1/operational-pendencies`: compras a receber, vendas confirmadas sem nota, OS concluídas sem nota, títulos vencidos | Hub usa contagem completa e informa o limite de itens por grupo; indicadores de ordens abertas no resumo continuam distinguindo amostra |
| Lista financeira filtrada por situação, pessoa, vencimento ou origem | Resolvido por filtros de servidor em contas-pagar/receber e `/resumo` com totais do conjunto filtrado | Páginas dedicadas aplicam filtros URL, paginação, ordenação e acesso ao título/histórico; baixa tem chave idempotente e lock no backend |
| Total de vencidas de todo o histórico | Resolvido na consulta de pendências, sem data inicial arbitrária | Hub não usa mais o recorte de contasAVencer para detectar vencidas antigas. Seletor de período permanece somente nos indicadores financeiros |
| Ligar OS concluída à nota e conta correspondentes | Resolvido por `GET /api/v1/service-orders/{id}/documents` e `POST /api/v1/service-orders/{id}/service-note` | Detalhe prepara a nota a partir da OS concluída, abre a nota existente e os títulos; preparar não cobra, emissão interna gera recebíveis uma única vez |

A rodada inicial era somente frontend. Na implementação integrada de 2026-09-12,
os contratos financeiros e de pendências acima foram entregues no backend;
o relatório de estoque mínimo continua abrindo a relação completa em sua aba existente.

## Importação XML e emissão externa — 2026-09-12

- Importação, conciliação, conferência e confirmação estão integradas em `/app/notas-entrada/importar`, com persistência em `/api/notas-entrada/importacoes`, controle de versão e recuperação por consulta após timeout. Não dependem de referência salva apenas no navegador.
- O recorte aceita NF-e modelo 55, versão 4.00, saída normal do fornecedor. Devoluções, complementos, ajustes e valores que o domínio atual não consegue representar não são confirmados silenciosamente.
- Validação estrutural do XML não equivale a validação completa de XSD, assinatura ou autorização fiscal. A interface não deve apresentar a importação ou a emissão interna como autorização externa.
- Emissão externa permanece bloqueada: não foi encontrado adaptador/contrato configurado de homologação para NF-e/NFS-e. Antes de expor envio/autorização reais, são necessários provedor com cobertura confirmada para cada documento, acesso de homologação, certificado quando exigido e configuração fiscal por empresa/município.
