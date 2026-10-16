import type { ThemeTokens } from './hubTokens';

/** Intenção visual de ícones de ação — uma cor por papel (padrão Hub YES7). */
export type ActionKind =
  | 'view'
  | 'edit'
  | 'add'
  | 'confirm'
  | 'warning'
  | 'cancel'
  | 'delete'
  | 'document'
  | 'inbound'
  | 'outbound';

export function actionIntentColor(kind: ActionKind, colors: ThemeTokens): string {
  switch (kind) {
    case 'view':
    case 'edit':
    case 'add':
      return colors.purple;
    case 'confirm':
    case 'inbound':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'cancel':
    case 'delete':
    case 'document':
    case 'outbound':
      return colors.danger;
    default:
      return colors.purple;
  }
}

export function actionHoverBg(color: string): string {
  return `${color}1A`;
}
