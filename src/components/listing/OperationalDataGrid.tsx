import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { Box } from '@mui/material';
import { DataGrid, type DataGridProps, type GridValidRowModel } from '@mui/x-data-grid';
import { useMemo } from 'react';

type Props<R extends GridValidRowModel> = DataGridProps<R> & { identityField?: string };

/** Mantém o DataGrid e seus comandos, dando hierarquia à célula que identifica o registro. */
export function OperationalDataGrid<R extends GridValidRowModel>({ columns, identityField, sx, ...props }: Props<R>) {
  const displayColumns = useMemo(() => columns.map((column) => {
    if (!identityField || column.field !== identityField) return column;
    const renderValue = column.renderCell;
    return {
      ...column,
      renderCell: (params: Parameters<NonNullable<typeof renderValue>>[0]) => {
        const text = String(params.formattedValue ?? params.value ?? '');
        return (
          <Box data-slot="row-identity" sx={{
            display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%', height: '100%',
          }}>
            <Box aria-hidden="true" sx={{
              flex: '0 0 24px', height: 24, display: 'grid', placeItems: 'center',
              borderRadius: '6px', bgcolor: 'action.selected', color: 'primary.main',
            }}>
              <ArticleOutlinedIcon sx={{ fontSize: 15 }} />
            </Box>
            <Box component="span" title={text || undefined} sx={{
              minWidth: 0, overflow: 'hidden', overflowWrap: 'anywhere', whiteSpace: 'normal', fontWeight: 750,
              lineHeight: 1.3, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
              '& .MuiLink-root': { fontWeight: 'inherit' },
            }}>
              {renderValue ? renderValue(params) : text}
            </Box>
          </Box>
        );
      },
    };
  }), [columns, identityField]);

  return <DataGrid<R> rowHeight={56} {...props} columns={displayColumns}
    sx={[
      {
        '& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader': { paddingInline: 1.5 },
        '& .MuiDataGrid-columnHeaderTitle': {
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
          whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.2,
        },
        '& .MuiDataGrid-cell--textRight': { fontVariantNumeric: 'tabular-nums', fontWeight: 650 },
        '& .MuiDataGrid-cell[data-field="__actions"]': { display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },
        '& .MuiDataGrid-columnHeader[data-field="__actions"], & .MuiDataGrid-cell[data-field="__actions"]': {
          paddingInline: 0.75,
          '& .MuiIconButton-root': { borderRadius: '100px', color: 'text.secondary', '&:hover': { bgcolor: 'action.selected', color: 'primary.main' } },
        },
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]} />;
}
