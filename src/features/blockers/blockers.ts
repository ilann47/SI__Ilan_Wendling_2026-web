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
 * Projecao informativa versionada do registro oficial
 * docs/especificacao/bloqueios-externos.md. Nao representa estado remoto.
 */
export const productBlockers: ProductBlocker[] = [
  {
    id: 'BLK-001', story: 'UC710/UC714 — Pagamento e reembolso', status: 'BLOQUEADA_EXTERNAMENTE',
    blockerType: 'Provider e credenciais',
    dependency: 'Gateway escolhido, sandbox, Pix/cartao e contrato seguro de webhook.',
    completed: 'Pedido, hold, confirmacao manual conciliavel e cancelamento compensatorio.',
    pending: 'Autorizacao, captura, webhook, reembolso, retry e conciliacao.',
    resumeCondition: 'Provider e contrato aprovados, sandbox funcional e segredo entregue por canal seguro.',
    impact: 'Pagamento eletronico, restituicao real e fechamento financeiro indisponiveis.',
    modules: ['Pedidos', 'Pagamentos', 'Financeiro'],
  },
  {
    id: 'BLK-002', story: 'UC713/UC714 — Politica comercial', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Politica e alcada',
    dependency: 'Prazos, multas, creditos, reembolso parcial, aprovacao e chargeback.',
    completed: 'Cancelamento compensatorio leva pedido confirmado a EM_REEMBOLSO.',
    pending: 'Elegibilidade, calculo, aprovacao e desfecho financeiro.',
    resumeCondition: 'Politica versionada aprovada, inclusive para aprovacao apos expiracao do inventario.',
    impact: 'Nao e seguro oferecer reembolso nem prometer prazo ou valor.',
    modules: ['Pedidos', 'Reembolsos'],
  },
  {
    id: 'BLK-003', story: 'UC716 — Operacao offline', status: 'BLOQUEADA_POR_INFRAESTRUTURA',
    blockerType: 'Edge e seguranca de dispositivo',
    dependency: 'Modelo de dispositivo, manifesto assinado, criptografia, expiracao e sincronizacao.',
    completed: 'QR online, decisao canonica, idempotencia e trilha de tentativas.',
    pending: 'Decisao local, pacotes, multiplos dispositivos e reconciliacao de conflitos.',
    resumeCondition: 'Arquitetura edge verificavel, identidade do dispositivo e politica de falha aprovadas.',
    impact: 'A operacao exige conectividade com a API central.',
    modules: ['Acesso', 'Dispositivos'],
  },
  {
    id: 'BLK-004', story: 'UC720/UC721 — Fechamento financeiro e DRE', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Fontes contabeis',
    dependency: 'Centros de custo, competencia, repasses, split, taxas, impostos e conciliacao.',
    completed: 'Encerramento operacional registra FONTES_FINANCEIRAS_PENDENTES.',
    pending: 'Conciliacao, aprovacao, fechamento imutavel, DRE e finalizacao.',
    resumeCondition: 'Fontes financeiras canonicas disponiveis e regras de rateio aprovadas.',
    impact: 'Evento sem fechamento financeiro ou DRE confiavel.',
    modules: ['Eventos', 'Financeiro'],
  },
  {
    id: 'BLK-005', story: 'UC722 — Fiscal externo', status: 'BLOQUEADA_EXTERNAMENTE',
    blockerType: 'Provider, certificado e legislacao',
    dependency: 'Escopo fiscal, certificado, ambiente, municipio/SEFAZ e contingencia.',
    completed: 'Documentos fiscais legados permanecem registros internos.',
    pending: 'Transmissao, protocolo, rejeicao, cancelamento e armazenamento fiscal.',
    resumeCondition: 'Provedor, ambiente, certificado e responsabilidade fiscal definidos.',
    impact: 'Registro interno nao equivale a autorizacao fiscal externa.',
    modules: ['Fiscal', 'Financeiro'],
  },
  {
    id: 'BLK-006', story: 'Cancelamento integral do evento', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Politica e compensacoes',
    dependency: 'Estados cancelaveis, comunicacao, pedidos, credenciais, reembolso e inventario.',
    completed: 'Cancelamento individual de pedido e compensatorio e idempotente.',
    pending: 'Orquestracao global, impactos e eventual reversao.',
    resumeCondition: 'Politica de cancelamento e matriz de compensacoes aprovadas.',
    impact: 'Nao existe acao segura de cancelamento global.',
    modules: ['Eventos', 'Pedidos', 'Credenciais'],
  },
  {
    id: 'BLK-007', story: 'Override ou admissao manual', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Alcada e ABAC',
    dependency: 'Aprovador, motivo, evidencia, turno, evento, patio, faixa e limites.',
    completed: 'Decisoes automaticas sao auditadas e ha permissoes operacionais.',
    pending: 'Comando de override e responsabilidade contextual.',
    resumeCondition: 'Contrato de aprovacao, ABAC e motivos canonicos definidos.',
    impact: 'Uma recusa nao pode ser convertida manualmente em autorizacao.',
    modules: ['Acesso', 'Auditoria'],
  },
  {
    id: 'BLK-008', story: 'Reemissao, desbloqueio e troca de veiculo', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Politica de credencial',
    dependency: 'Origem do bloqueio, alcada, sucessao de credencial, unicidade e placa.',
    completed: 'Emissao, QR e bloqueio operacional ou compensatorio.',
    pending: 'Desbloqueio seguro, reemissao e atualizacao de placa.',
    resumeCondition: 'Estados, alcadas, motivos de bloqueio e migracao de unicidade definidos.',
    impact: 'A interface oferece somente emissao, QR e bloqueio reais.',
    modules: ['Credenciais', 'Acesso'],
  },
  {
    id: 'BLK-009', story: 'UC729 — Escalas', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Identidade laboral e contrato',
    dependency: 'Vinculo de identidade, funcao, qualificacao, turno, substituicao e aceite.',
    completed: 'Identidades legadas e RBAC organizacional existem separadamente.',
    pending: 'Agregado, estados, APIs e escopo operacional de escala.',
    resumeCondition: 'Modelo canonico de identidade laboral e contratos de escala aprovados.',
    impact: 'ABAC por evento, patio, faixa e turno nao pode ser aplicado.',
    modules: ['Pessoas', 'Acesso'],
  },
  {
    id: 'BLK-010', story: 'UC730 — Integracoes externas', status: 'BLOQUEADA_EXTERNAMENTE',
    blockerType: 'Contrato e homologacao',
    dependency: 'Integracao escolhida, autenticacao, credenciais, limites, schemas e SLA.',
    completed: 'Outbox transacional preserva fatos internos.',
    pending: 'Inbox, adapters, entrega, retry, quarentena e replay.',
    resumeCondition: 'Parceiro concreto, documentacao e ambiente de homologacao disponiveis.',
    impact: 'Parceiros, equipamentos e webhooks externos nao podem ser ativados.',
    modules: ['Integracoes', 'Outbox'],
  },
  {
    id: 'BLK-011', story: 'Equipamentos e barreiras', status: 'BLOQUEADA_POR_INFRAESTRUTURA',
    blockerType: 'Hardware e identidade',
    dependency: 'Fabricante, SDK, cancela, leitor/LPR/RFID, controlador e telemetria.',
    completed: 'A API informa explicitamente barrierCommandRequested=false.',
    pending: 'Provisionamento, comando fisico, confirmacao e contingencia.',
    resumeCondition: 'Equipamento, protocolo, ambiente de teste e politica operacional aprovados.',
    impact: 'Check-in e check-out nao acionam barreira fisica.',
    modules: ['Acesso', 'Equipamentos'],
  },
  {
    id: 'BLK-012', story: 'Quota por canal e ocupacao granular', status: 'BLOQUEADA_POR_DECISAO_DE_NEGOCIO',
    blockerType: 'Modelo comercial e fisico',
    dependency: 'Catalogo de canais e roteamento produto, setor e vaga.',
    completed: 'Quota total, capacidade por patio e ocupacao da alocacao sao concorrentes.',
    pending: 'Limites por canal e projecao fisica granular.',
    resumeCondition: 'Regras de canal e roteamento aprovadas com contratos de leitura.',
    impact: 'A interface nao pode mostrar granularidade que o banco nao registra.',
    modules: ['Inventario', 'Ocupacao'],
  },
  {
    id: 'BLK-013', story: 'Abertura agendada de vendas', status: 'BLOQUEADA_POR_INFRAESTRUTURA',
    blockerType: 'Scheduler confiavel',
    dependency: 'Persistencia, reagendamento, eleicao multi-instancia e recuperacao.',
    completed: 'Abertura imediata versionada esta concluida.',
    pending: 'Execucao futura exatamente uma vez e observavel.',
    resumeCondition: 'Contrato de agendamento e estrategia transacional definidos.',
    impact: 'A interface aceita somente abertura imediata.',
    modules: ['Eventos', 'Vendas'],
  },
];
