import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import { Box, ButtonBase, Chip, Divider, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { describeError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../components/SnackbarProvider';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';

export function ContextSelector() {
  const { user, activeOrganization, organizations, selectOrganization } = useAuth();
  const { recent } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [switching, setSwitching] = useState<number | null>(null);
  const event = recent('event')[0];
  const venue = recent('venue')[0];
  const organizationName = activeOrganization?.tradeName || activeOrganization?.legalName || 'Organização';
  const role = user?.perfil === 'ADMIN' ? 'Administrador' : 'Operador';

  return (
    <>
      <ButtonBase
        aria-label="Contexto operacional"
        aria-haspopup="true"
        onClick={(eventClick) => setAnchor(eventClick.currentTarget)}
        sx={{
          maxWidth: { xs: 180, sm: 320, md: 420 },
          px: 1.25, py: 0.75, borderRadius: 2, textAlign: 'left',
        }}
      >
        <Stack spacing={0.15} sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="subtitle2" noWrap>{organizationName}</Typography>
            <ExpandMoreOutlinedIcon fontSize="small" />
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap>
            {role}
            {venue ? ` · ${venue.label}` : ''}
            {event ? ` · ${event.label}` : ''}
          </Typography>
        </Stack>
      </ButtonBase>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <Box sx={{ px: 2, py: 1, minWidth: 240 }}>
          <Typography variant="overline" color="text.secondary">Organização</Typography>
          <Typography variant="body2">{organizationName}</Typography>
          <Typography variant="caption" color="text.secondary">Papel: {role}</Typography>
        </Box>
        {(venue || event) && (
          <Box sx={{ px: 2, pb: 1 }}>
            {venue && <Chip size="small" label={`Instalação: ${venue.label}`} sx={{ mr: 0.5, mb: 0.5 }} />}
            {event && <Chip size="small" label={`Evento: ${event.label}`} sx={{ mb: 0.5 }} />}
          </Box>
        )}
        {organizations.length > 1 && <Divider />}
        {organizations.length > 1 && (
          <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 1, display: 'block' }}>
            Trocar organização
          </Typography>
        )}
        {organizations
          .filter((organization) => organization.organizationId !== activeOrganization?.organizationId)
          .map((organization) => (
            <MenuItem
              key={organization.organizationId}
              disabled={switching !== null}
              onClick={async () => {
                setSwitching(organization.organizationId);
                try {
                  await selectOrganization(organization.organizationId);
                  setAnchor(null);
                  navigate('/app');
                } catch (cause) {
                  notify(describeError(cause), 'error');
                } finally {
                  setSwitching(null);
                }
              }}
            >
              <BusinessOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
              {organization.tradeName || organization.legalName}
            </MenuItem>
          ))}
      </Menu>
    </>
  );
}
