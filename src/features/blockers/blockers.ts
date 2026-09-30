export const blockerStatuses = [
  'BLOQUEADA_EXTERNAMENTE',
  'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
  'BLOQUEADA_POR_INFRAESTRUTURA',
] as const;

export type BlockerStatus = typeof blockerStatuses[number];

export interface ProductBlocker {
  id: string;
  story: string;
  status: BlockerStatus;
  blockerType: string;
  dependency: string;
  completed: string;
  pending: string;
  resumeCondition: string;
  impact: string;
  modules: string[];
}

/**
 * Projeção informativa versionada do registro oficial
 * docs/especificacao/bloqueios-externos.md. Não representa estado remoto.
 */
export const productBlockers: ProductBlocker[] = [
  {
    id: 'BLK-001', story: 'UC710/UC714 — Pagamento e reembolso', status: 'BLOQUEADA_EXTERNAMENTE',
    blockerType: 'Provedor e credenciais',
    dependency: 'Gateway escolhido, sandbox, Pix/cartão e contrato seguro de webhook.',
    completed: 'Pedido, reserva temporária, confirmação manual conciliável e cancelamento compensatório.',
    pending: 'Autorização, captura, webhook, reembolso, repetição e conciliação.',
    resumeCondition: 'Provedor e contrato aprovados, ambiente de testes funcional e segredo entregue por canal seguro.',
    impact: 'Pagamento eletrônico, restituição real e fechamento financeiro indisponíveis.',
    modules: ['Pedidos', 'Pagamentos', 'Financeiro'],
  },
  {
    id: 'BLK-002', story: 'UC713/UC714 — Política comercial', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Política e alçada',
    dependency: 'Prazos, multas, créditos, reembolso parcial, aprovação e contestação de pagamento.',
    completed: 'Cancelamento compensatório leva o pedido confirmado para reembolso.',
    pending: 'Elegibilidade, cálculo, aprovação e desfecho financeiro.',
    resumeCondition: 'Política versionada aprovada, inclusive para aprovação após expiração do inventário.',
    impact: 'Não é seguro oferecer reembolso nem prometer prazo ou valor.',
    modules: ['Pedidos', 'Reembolsos'],
  },
  {
    id: 'BLK-003', story: 'UC716 — Operação offline', status: 'BLOQUEADA_POR_INFRAESTRUTURA',
    blockerType: 'Processamento local e segurança de dispositivo',
    dependency: 'Modelo de dispositivo, manifesto assinado, criptografia, expiração e sincronização.',
    completed: 'QR online, decisão canônica, idempotência e trilha de tentativas.',
    pending: 'Decisão local, pacotes, múltiplos dispositivos e reconciliação de conflitos.',
    resumeCondition: 'Arquitetura local verificável, identidade do dispositivo e política de falha aprovadas.',
    impact: 'A operação exige conectividade com a API central.',
    modules: ['Acesso', 'Dispositivos'],
  },
  {
    id: 'BLK-004', story: 'UC720/UC721 — Fechamento financeiro e DRE', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Fontes contábeis',
    dependency: 'Centros de custo, competência, repasses, divisão de receitas, taxas, impostos e conciliação.',
    completed: 'O encerramento operacional registra que as fontes financeiras estão pendentes.',
    pending: 'Conciliação, aprovação, fechamento imutável, DRE e finalização.',
    resumeCondition: 'Fontes financeiras canônicas disponíveis e regras de rateio aprovadas.',
    impact: 'Evento sem fechamento financeiro ou DRE confiável.',
    modules: ['Eventos', 'Financeiro'],
  },
  {
    id: 'BLK-005', story: 'UC722 — Fiscal externo', status: 'BLOQUEADA_EXTERNAMENTE',
    blockerType: 'Provedor, certificado e legislação',
    dependency: 'Escopo fiscal, certificado, ambiente, município/SEFAZ e contingência.',
    completed: 'Documentos fiscais legados permanecem registros internos.',
    pending: 'Transmissão, protocolo, rejeição, cancelamento e armazenamento fiscal.',
    resumeCondition: 'Provedor, ambiente, certificado e responsabilidade fiscal definidos.',
    impact: 'Registro interno não equivale a autorização fiscal externa.',
    modules: ['Fiscal', 'Financeiro'],
  },
  {
    id: 'BLK-006', story: 'Cancelamento integral do evento', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Política e compensações',
    dependency: 'Estados canceláveis, comunicação, pedidos, credenciais, reembolso e inventário.',
    completed: 'O cancelamento individual de pedido é compensatório e idempotente.',
    pending: 'Orquestração global, impactos e eventual reversão.',
    resumeCondition: 'Política de cancelamento e matriz de compensações aprovadas.',
    impact: 'Não existe ação segura de cancelamento global.',
    modules: ['Eventos', 'Pedidos', 'Credenciais'],
  },
  {
    id: 'BLK-007', story: 'Exceção ou admissão manual', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Alçada e ABAC',
    dependency: 'Aprovador, motivo, evidência, turno, evento, pátio, faixa e limites.',
    completed: 'Decisões automáticas são auditadas e há permissões operacionais.',
    pending: 'Comando de exceção e responsabilidade contextual.',
    resumeCondition: 'Contrato de aprovação, ABAC e motivos canônicos definidos.',
    impact: 'Uma recusa não pode ser convertida manualmente em autorização.',
    modules: ['Acesso', 'Auditoria'],
  },
  {
    id: 'BLK-008', story: 'Reemissão, desbloqueio e troca de veículo', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Política de credencial',
    dependency: 'Origem do bloqueio, alçada, sucessão de credencial, unicidade e placa.',
    completed: 'Emissão, QR e bloqueio operacional ou compensatório.',
    pending: 'Desbloqueio seguro, reemissão e atualização de placa.',
    resumeCondition: 'Estados, alçadas, motivos de bloqueio e migração de unicidade definidos.',
    impact: 'A interface oferece somente emissão, QR e bloqueio reais.',
    modules: ['Credenciais', 'Acesso'],
  },
  {
    id: 'BLK-009', story: 'UC729 — Escalas', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Identidade laboral e contrato',
    dependency: 'Vínculo de identidade, função, qualificação, turno, substituição e aceite.',
    completed: 'Identidades legadas e RBAC organizacional existem separadamente.',
    pending: 'Agregado, estados, APIs e escopo operacional de escala.',
    resumeCondition: 'Modelo canônico de identidade laboral e contratos de escala aprovados.',
    impact: 'ABAC por evento, pátio, faixa e turno não pode ser aplicado.',
    modules: ['Pessoas', 'Acesso'],
  },
  {
    id: 'BLK-010', story: 'UC730 — Integrações externas', status: 'BLOQUEADA_EXTERNAMENTE',
    blockerType: 'Contrato e homologação',
    dependency: 'Integração escolhida, autenticação, credenciais, limites, esquemas e SLA.',
    completed: 'Outbox transacional preserva fatos internos.',
    pending: 'Recebimento, adaptadores, entrega, novas tentativas, quarentena e reprocessamento.',
    resumeCondition: 'Parceiro concreto, documentação e ambiente de homologação disponíveis.',
    impact: 'Parceiros, equipamentos e webhooks externos não podem ser ativados.',
    modules: ['Integrações', 'Outbox'],
  },
  {
    id: 'BLK-011', story: 'Equipamentos e barreiras', status: 'BLOQUEADA_POR_INFRAESTRUTURA',
    blockerType: 'Hardware e identidade',
    dependency: 'Fabricante, SDK, cancela, leitor/LPR/RFID, controlador e telemetria.',
    completed: 'A API informa explicitamente barrierCommandRequested=false.',
    pending: 'Provisionamento, comando físico, confirmação e contingência.',
    resumeCondition: 'Equipamento, protocolo, ambiente de teste e política operacional aprovados.',
    impact: 'Check-in e check-out não acionam barreira física.',
    modules: ['Acesso', 'Equipamentos'],
  },
  {
    id: 'BLK-012', story: 'Cota por canal e ocupação granular', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Modelo comercial e físico',
    dependency: 'Catálogo de canais e roteamento produto, setor e vaga.',
    completed: 'Cota total, capacidade por pátio e ocupação da alocação são concorrentes.',
    pending: 'Limites por canal e projeção física granular.',
    resumeCondition: 'Regras de canal e roteamento aprovadas com contratos de leitura.',
    impact: 'A interface não pode mostrar granularidade que o banco não registra.',
    modules: ['Inventário', 'Ocupação'],
  },
  {
    id: 'BLK-013', story: 'Abertura agendada de vendas', status: 'BLOQUEADA_POR_INFRAESTRUTURA',
    blockerType: 'Agendador confiável',
    dependency: 'Persistência, reagendamento, eleição multi-instância e recuperação.',
    completed: 'A abertura imediata versionada está concluída.',
    pending: 'Execução futura exatamente uma vez e observável.',
    resumeCondition: 'Contrato de agendamento e estratégia transacional definidos.',
    impact: 'A interface aceita somente abertura imediata.',
    modules: ['Eventos', 'Vendas'],
  },
];
