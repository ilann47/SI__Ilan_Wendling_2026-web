export const facilityCategories = [
  'COMUM', 'VIP', 'PCD', 'STAFF', 'ONIBUS', 'VAN', 'CORTESIA',
] as const;

export type FacilityCategory = (typeof facilityCategories)[number];

const facilityCategoryLabels: Record<FacilityCategory, string> = {
  COMUM: 'Comum',
  VIP: 'VIP',
  PCD: 'PCD',
  STAFF: 'Equipe',
  ONIBUS: 'Ônibus',
  VAN: 'Van',
  CORTESIA: 'Cortesia',
};

export function facilityCategoryLabel(category: FacilityCategory): string {
  return facilityCategoryLabels[category];
}

export interface SpaceImportItem {
  code: string;
  type: FacilityCategory;
  accessible: boolean;
  position: string | null;
}

export function parseSpacesText(value: string): SpaceImportItem[] {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error('Informe ao menos uma vaga.');
  if (lines.length > 500) throw new Error('O lote aceita no máximo 500 vagas.');

  return lines.map((line, index) => {
    const [rawCode, rawType, rawAccessible, rawPosition = ''] = line.split(';');
    const code = rawCode?.trim();
    const type = rawType?.trim().toUpperCase();
    const accessibleText = rawAccessible?.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!code || !facilityCategories.includes(type as FacilityCategory)) {
      throw new Error(`Linha ${index + 1}: código ou categoria inválida.`);
    }
    if (!['sim', 'nao', 'true', 'false', '1', '0'].includes(accessibleText)) {
      throw new Error(`Linha ${index + 1}: acessibilidade deve ser sim ou não.`);
    }
    return {
      code,
      type: type as FacilityCategory,
      accessible: ['sim', 'true', '1'].includes(accessibleText),
      position: rawPosition.trim() || null,
    };
  });
}
