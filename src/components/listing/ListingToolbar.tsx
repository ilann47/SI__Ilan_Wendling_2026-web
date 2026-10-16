import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import {
  Badge,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useColorMode } from '../../context/ColorModeContext';
import { getThemeTokens } from '../../theme/hubTokens';
import type { FilterConfig } from '../crud/resourceConfig';
import { AppDialog } from '../common/AppDialog';

interface Props {
  searchValue: string;
  searchLabel?: string;
  onSearchChange: (value: string) => void;
  advancedFilters?: FilterConfig[];
  filterForm?: ReactNode;
  appliedCount?: number;
  onClear?: () => void;
}

/** Toolbar de listagem no padrão ERPGrid do Hub (busca pill + filtros). */
export function ListingToolbar({
  searchValue,
  searchLabel = 'Buscar…',
  onSearchChange,
  filterForm,
  appliedCount,
  onClear,
}: Props) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const [open, setOpen] = useState(false);
  const count = appliedCount ?? 0;

  const panel = (
    <AppDialog
      open={open}
      onClose={() => setOpen(false)}
      title="Filtros"
      maxWidth="xs"
      fullScreenOnMobile
      contentSx={{ minHeight: 96 }}
      actions={(
        <>
          {onClear && <Button color="inherit" onClick={onClear}>Limpar filtros</Button>}
          <Button variant="contained" onClick={() => setOpen(false)}>Aplicar</Button>
        </>
      )}
    >
      {filterForm}
    </AppDialog>
  );

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
      <TextField
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchLabel}
        aria-label={searchLabel}
        fullWidth
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlinedIcon sx={{ fontSize: 18, color: colors.textMuted }} />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 999,
            bgcolor: colors.background,
            fontSize: '0.85rem',
          },
        }}
      />
      {filterForm && (
        <Box sx={{ flexShrink: 0 }}>
          <Badge badgeContent={count} color="primary" invisible={count === 0}>
            <Button
              variant="outlined"
              startIcon={<FilterListOutlinedIcon />}
              onClick={() => setOpen(true)}
              aria-label={count > 0 ? `Filtros, ${count} aplicados` : 'Filtros'}
              sx={{
                borderRadius: 999,
                borderColor: colors.border,
                color: colors.text,
                bgcolor: colors.card,
                px: 2,
                minHeight: 40,
                '&:hover': { borderColor: colors.purpleSoft, bgcolor: colors.brandHover },
              }}
            >
              Filtros
            </Button>
          </Badge>
        </Box>
      )}
      {panel}
    </Stack>
  );
}
