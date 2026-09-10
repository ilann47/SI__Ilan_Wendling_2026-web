import type { MouseEvent, ReactNode } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import OutboxOutlinedIcon from '@mui/icons-material/OutboxOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useColorMode } from '../../context/ColorModeContext';
import { actionHoverBg, actionIntentColor, type ActionKind } from '../../theme/actionTokens';
import { getThemeTokens } from '../../theme/hubTokens';

const DEFAULT_ICONS: Record<ActionKind, typeof VisibilityOutlinedIcon> = {
  view: VisibilityOutlinedIcon,
  edit: EditOutlinedIcon,
  add: AddIcon,
  confirm: CheckCircleOutlinedIcon,
  warning: WarningAmberOutlinedIcon,
  cancel: CancelOutlinedIcon,
  delete: DeleteOutlinedIcon,
  document: PictureAsPdfOutlinedIcon,
  inbound: MoveToInboxOutlinedIcon,
  outbound: OutboxOutlinedIcon,
};

type Props = {
  kind: ActionKind;
  title: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  icon?: ReactNode;
  stopPropagation?: boolean;
};

/** Botão de ação colorido por intenção — portado do Hub YES7. */
export function ActionIconButton({
  kind,
  title,
  onClick,
  disabled,
  icon,
  stopPropagation = true,
}: Props) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const color = actionIntentColor(kind, colors);
  const Icon = DEFAULT_ICONS[kind];

  const button = (
    <IconButton
      size="small"
      disabled={disabled}
      aria-label={title}
      onClick={(event) => {
        if (stopPropagation) event.stopPropagation();
        onClick(event);
      }}
      sx={{
        color,
        '&:hover': { bgcolor: actionHoverBg(color) },
      }}
    >
      {icon ?? <Icon fontSize="small" />}
    </IconButton>
  );

  if (disabled) {
    return (
      <Tooltip title={title}>
        <span>{button}</span>
      </Tooltip>
    );
  }

  return <Tooltip title={title}>{button}</Tooltip>;
}

export function ActionIconsRow({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
      {children}
    </Box>
  );
}
