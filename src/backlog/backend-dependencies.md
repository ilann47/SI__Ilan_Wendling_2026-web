# Dependências de backend (frontend)

Estas necessidades ficaram registradas porque a melhoria de produto depende de contrato que o frontend atual não possui. Nenhuma delas foi simulada com dados falsos.

| Necessidade | Por que importa | Estado na UI |
|---|---|---|
| Agregado de ocupação por pátio/instalação selecionada | Dashboard e seletor de contexto | Usa `/api/relatorios/patio` sem recorte por instalação |
| Filtro oficial de contas vencidas/vencendo nas listagens | Abrir contas já filtradas a partir do dashboard | Dashboard usa `/api/relatorios/contas-a-vencer`; listagens não recebem o recorte |
| Vínculo explícito ordem de compra → nota de entrada / conta a pagar | Detalhe da ordem | Texto honesto: informação não disponibilizada |
| Vínculo venda administrativa → nota de saída / conta a receber / movimento de estoque | Detalhe da venda | Texto honesto |
| Vínculo ordem de serviço → nota de serviço / conta a receber / responsável | Detalhe da OS | Texto honesto |
| Relacionamentos do cliente (mensalidades, movimentações, vendas, notas, contas) | Detalhe do cliente | Somente cadastro + veículos quando o filtro `clienteId` existir |
| Histórico de transições da ordem de serviço | Linha do tempo operacional | Não exibido |
| Pagamentos/baixas detalhados no título financeiro | Detalhe de contas | Ação de baixa existe; lista de pagamentos não |
| Busca global com destaque de campo de origem | Navegação ao detalhe mais específico | Navega para a listagem do módulo (`caminho` da API) |
| Capacidade nominal do pátio | Indicador de ocupação percentual | Mostra veículos atuais, sem capacidade |

Atualizado em 2026-09-04.
