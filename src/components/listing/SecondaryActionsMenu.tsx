import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { useId, useState, type MouseEvent, type ReactNode } from 'react';

export interface SecondaryAction {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

interface Props {
  actions: SecondaryAction[];
  label?: string;
}

export function SecondaryActionsMenu({ actions, label = 'Ações' }: Props) {
  const buttonId = useId();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (actions.length === 0) return null;

  const open = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchor(event.currentTarget);
  };

  return (
    <>
      <IconButton
        id={buttonId}
        aria-label={label}
        aria-controls={anchor ? menuId : undefined}
        aria-haspopup="true"
        aria-expanded={anchor ? 'true' : undefined}
        onClick={open}
        size="small"
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        MenuListProps={{ 'aria-labelledby': buttonId }}
      >
        {actions.map((action) => (
          <MenuItem
            key={action.key}
            disabled={action.disabled}
            title={action.disabled ? action.disabledReason : undefined}
            onClick={(event) => {
              event.stopPropagation();
              setAnchor(null);
              action.onClick();
            }}
            sx={action.danger ? { color: 'error.main' } : undefined}
          >
            {action.icon && <ListItemIcon sx={action.danger ? { color: 'error.main' } : undefined}>{action.icon}</ListItemIcon>}
            <ListItemText primary={action.label} secondary={action.disabled ? action.disabledReason : undefined} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
