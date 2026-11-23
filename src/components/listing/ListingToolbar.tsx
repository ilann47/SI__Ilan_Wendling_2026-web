import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {
  Badge,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useColorMode } from '../../context/ColorModeContext';
import { componentRadius, getThemeTokens } from '../../theme/hubTokens';
import type { FilterConfig } from '../crud/resourceConfig';
import { AppDialog } from '../common/AppDialog';

interface Props {
  searchValue: string;
  searchLabel?: string;
  onSearchChange: (value: string) => void;
  advancedFilters?: FilterConfig[];
  filterForm?: ReactNode;
  sortControl?: ReactNode;
  appliedCount?: number;
  onClear?: () => void;
}

/** Controles da listagem no mesmo tratamento visual da busca do Seven. */
export function ListingToolbar({
  searchValue,
  searchLabel = 'Buscar…',
  onSearchChange,
  filterForm,
  sortControl,
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
          {onClear && <Button variant="outlined" onClick={onClear}>Limpar filtros</Button>}
          <Button variant="contained" onClick={() => setOpen(false)}>Aplicar</Button>
        </>
      )}
    >
      {filterForm}
    </AppDialog>
  );

  return (
    <Paper
      component="section"
      role="search"
      aria-label="Ferramentas da listagem"
      variant="outlined"
      sx={{ mb: 2, p: 1, borderRadius: `${componentRadius.surface}px`, bgcolor: colors.card }}
    >
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
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
          endAdornment: searchValue ? (
            <InputAdornment position="end">
              <IconButton size="small" aria-label="Limpar busca" onClick={() => onSearchChange('')}>
                <CloseOutlinedIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: `${componentRadius.pill}px`,
            bgcolor: colors.card,
            fontSize: '0.85rem',
          },
        }}
      />
      {sortControl}
      {filterForm && (
        <Box sx={{ flexShrink: 0 }}>
          <Badge badgeContent={count} color="primary" invisible={count === 0}>
            <Button
              color="inherit"
              startIcon={<FilterListOutlinedIcon />}
              onClick={() => setOpen(true)}
              aria-label={count > 0 ? `Filtros, ${count} aplicados` : 'Filtros'}
              sx={{
                borderRadius: `${componentRadius.pill}px`,
                color: colors.purple,
                bgcolor: colors.brandHover,
                boxShadow: `inset 0 0 0 1px ${colors.border}`,
                px: 2,
                minHeight: 44,
                '&:hover': { bgcolor: colors.brandHover, boxShadow: `inset 0 0 0 1px ${colors.purple}` },
              }}
            >
              Filtros
            </Button>
          </Badge>
        </Box>
      )}
      {panel}
    </Stack>
    </Paper>
  );
}
