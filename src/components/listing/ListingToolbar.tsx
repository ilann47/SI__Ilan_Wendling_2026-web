import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import {
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  InputAdornment,
  Stack,
  TextField,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';
import type { FilterConfig } from '../crud/resourceConfig';

interface Props {
  searchValue: string;
  searchLabel?: string;
  onSearchChange: (value: string) => void;
  advancedFilters?: FilterConfig[];
  filterForm?: ReactNode;
  appliedCount?: number;
  onClear?: () => void;
}

export function ListingToolbar({
  searchValue,
  searchLabel = 'Buscar',
  onSearchChange,
  filterForm,
  appliedCount,
  onClear,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(false);
  const count = appliedCount ?? 0;

  const panel = (
    <>
      {isMobile ? (
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" aria-labelledby="filtros-titulo">
          <DialogTitle id="filtros-titulo">Filtros</DialogTitle>
          <DialogContent>{filterForm}</DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            {onClear && <Button color="inherit" onClick={onClear}>Limpar filtros</Button>}
            <Button variant="contained" onClick={() => setOpen(false)}>Aplicar</Button>
          </DialogActions>
        </Dialog>
      ) : (
        <Drawer
          anchor="right"
          open={open}
          onClose={() => setOpen(false)}
          PaperProps={{ sx: { width: 400, p: 1 } }}
        >
          <DialogTitle id="filtros-titulo">Filtros</DialogTitle>
          <DialogContent>{filterForm}</DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            {onClear && <Button color="inherit" onClick={onClear}>Limpar filtros</Button>}
            <Button variant="contained" onClick={() => setOpen(false)}>Aplicar</Button>
          </DialogActions>
        </Drawer>
      )}
    </>
  );

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
      <TextField
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchLabel}
        aria-label={searchLabel}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlinedIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      {filterForm && (
        <Box sx={{ flexShrink: 0 }}>
          <Badge badgeContent={count} color="primary" invisible={count === 0}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<FilterListOutlinedIcon />}
              onClick={() => setOpen(true)}
              aria-label={count > 0 ? `Filtros, ${count} aplicados` : 'Filtros'}
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
