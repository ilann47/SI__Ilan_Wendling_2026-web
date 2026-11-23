import { MenuItem, TablePagination, TextField } from '@mui/material';
import { listSizes, type ListSortOption, type useListView } from './useListView';

export function ListSort({ options, value, onChange }: {
  options: readonly ListSortOption[]; value: string; onChange: (value: string) => void;
}) {
  return <TextField select size="small" label="Ordenar por" value={value}
    onChange={(event) => onChange(event.target.value)} sx={{ minWidth: { xs: 0, sm: 185 }, flexShrink: 0 }}>
    {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
  </TextField>;
}

export function ListPagination({ view, total }: { view: ReturnType<typeof useListView>; total?: number }) {
  if (!total || view.page >= Math.ceil(total / view.size)) return null;
  return <TablePagination component="div" count={total} page={view.page} rowsPerPage={view.size} rowsPerPageOptions={listSizes}
    onPageChange={(_, page) => view.setPage(page)} onRowsPerPageChange={(event) => view.setSize(Number(event.target.value))}
    labelRowsPerPage="Por página" labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
    getItemAriaLabel={(type) => ({ previous: 'Página anterior', next: 'Próxima página', first: 'Primeira página', last: 'Última página' })[type]}
    sx={{ '& .MuiTablePagination-toolbar': { px: { xs: 0, sm: 2 }, flexWrap: 'wrap', justifyContent: 'flex-end' },
      '& .MuiTablePagination-spacer': { display: { xs: 'none', sm: 'block' } },
      '& .MuiTablePagination-actions': { ml: { xs: 1, sm: 2.5 } } }} />;
}
