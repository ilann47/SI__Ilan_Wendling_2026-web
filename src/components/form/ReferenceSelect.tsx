import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { api, describeError } from '../../api/client';
import { tenantQueryKey } from '../../api/queryKeys';
import type { ReferenceConfig } from './fieldConfig';
import { useQuickCreate } from '../../context/quickCreateCore';
import { ReferencePickerDialog, optionLabel, type RefOption } from './ReferencePickerDialog';
import { useAuth } from '../../auth/AuthContext';
import { hasResourceActionPermission } from '../crud/resourceConfig';

interface Props {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null, option?: RefOption) => void;
  reference: ReferenceConfig;
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  reserveHelperSpace?: boolean;
}

/**
 * Campo de referencia: exibe o registro selecionado e abre um seletor
 * (lista + busca + "cadastrar") ao ser clicado. O rotulo do selecionado e
 * resolvido buscando o registro pelo id.
 */
export function ReferenceSelect({
  label, value, onChange, reference, required, error, helperText, disabled, reserveHelperSpace,
}: Props) {
  const quick = useQuickCreate();
  const resourceConfig = quick?.configFor(reference.basePath);
  const singular = resourceConfig?.singular ?? label;
  const { activeOrganization, permissions } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const requiresTenant = !resourceConfig || resourceConfig.tenantAware;
  const canRead = (!requiresTenant || !!orgId) && (!resourceConfig
    || hasResourceActionPermission(resourceConfig, 'read', permissions))
    && (reference.readPermissions?.every((permission) => permissions.includes(permission)) ?? true);
  const unavailable = disabled || !canRead;
  const [open, setOpen] = useState(false);

  // O valor pode chegar como '' (default do formulario); normaliza para id numerico ou null.
  const parsed = value == null || `${value}`.trim() === '' ? null : Number(value);
  const id = parsed != null && Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;

  const selectedQuery = useQuery({
    queryKey: orgId ? tenantQueryKey(orgId, 'reference-one', reference.basePath, id)
      : ['reference-one', 'global', reference.basePath, id],
    queryFn: () => api.get<RefOption>(`${reference.basePath}/${id}`).then((r) => r.data),
    enabled: id != null && canRead,
    staleTime: 60_000,
  });

  const selected = canRead && !selectedQuery.isError ? selectedQuery.data : undefined;
  const referenceError = !canRead ? 'Selecione uma organização e confira a permissão de consulta.'
    : selectedQuery.isError ? describeError(selectedQuery.error) : undefined;
  const display = id == null || !canRead ? '' : selected ? optionLabel(selected, reference)
    : selectedQuery.isPending ? 'Carregando cadastro…' : 'Cadastro indisponível';

  return (
    <>
      <TextField
        fullWidth
        size="small"
        label={label}
        required={required}
        disabled={unavailable}
        error={!!error || selectedQuery.isError}
        helperText={error ?? referenceError ?? helperText ?? (reserveHelperSpace ? ' ' : undefined)}
        FormHelperTextProps={reserveHelperSpace ? { sx: { minHeight: '1.25rem', mt: 0.5 } } : undefined}
        placeholder="Selecionar..."
        value={display}
        onClick={() => {
          if (!unavailable) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!unavailable && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setOpen(true); }
        }}
        inputProps={{ readOnly: true, style: { cursor: unavailable ? 'default' : 'pointer' } }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {id != null && !unavailable ? (
                <Tooltip title="Limpar">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(null);
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              <IconButton aria-label={`Selecionar ${label.toLowerCase()}`} size="small" disabled={unavailable} onClick={() => setOpen(true)}>
                <SearchIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <ReferencePickerDialog
        key={orgId ?? 'global'}
        open={open && canRead}
        reference={reference}
        singular={singular}
        value={id}
        onSelect={(selectedId, option) => onChange(selectedId, option)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
