import { createContext, useContext } from 'react';
import { type ResourceConfig } from '../components/crud/resourceConfig';

/**
 * Definicao do contexto de "criar na hora", separada do Provider para evitar
 * ciclo de imports: os campos de referencia (ReferenceSelect/ReferencePickerDialog)
 * consomem apenas o hook daqui, sem puxar o Provider — que, por sua vez, importa
 * o formulario de cadastro, que reusa os campos de referencia.
 */
export interface QuickCreateValue {
  /** Config de cadastro de um endpoint referenciado, se existir um cadastro para ele. */
  configFor: (basePath: string) => ResourceConfig | undefined;
  /** Abre o cadastro do recurso em um diálogo; resolve com o id criado (ou null se cancelado). */
  openCreate: (config: ResourceConfig) => Promise<number | null>;
}

export const QuickCreateContext = createContext<QuickCreateValue | null>(null);

export function useQuickCreate(): QuickCreateValue | null {
  return useContext(QuickCreateContext);
}
