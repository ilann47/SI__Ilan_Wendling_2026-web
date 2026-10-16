export const accessReasonLabels: Record<string, string> = {
  AUTORIZADA: 'Acesso autorizado',
  CREDENCIAL_INVALIDA: 'Credencial invalida',
  CREDENCIAL_INATIVA: 'Credencial inativa',
  FORA_DA_JANELA: 'Fora da janela de acesso',
  EVENTO_FORA_DE_OPERACAO: 'Evento fora de operacao',
  PATIO_INCORRETO: 'Credencial destinada a outro patio',
  ENTRADA_DUPLICADA: 'Entrada ja registrada',
  PATIO_LOTADO: 'Patio com capacidade esgotada',
  PRESENCA_INEXISTENTE: 'Nenhuma entrada ativa para esta credencial',
  SAIDA_DUPLICADA: 'Saida ja registrada',
};

export function accessReasonLabel(code: string): string {
  return accessReasonLabels[code] ?? code;
}
