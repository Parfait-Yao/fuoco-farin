'use client';

import * as React from 'react';
import { Box, Card, Pagination, Typography } from '@mui/material';
import dynamic from 'next/dynamic';
import type { GridColDef, GridValidRowModel, GridRowParams } from '@mui/x-data-grid';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsMobile } from '@/hooks';
import { ListSkeleton } from './feedback';
import { useMessages } from '@/i18n/client';

// DataGrid is heavy (~1 600 modules): load it only when a desktop table renders,
// so pages that merely import the ui barrel stay light.
const DataGrid = dynamic(() => import('@mui/x-data-grid').then((m) => m.DataGrid), {
  ssr: false,
  loading: () => <ListSkeleton rows={6} />,
}) as typeof import('@mui/x-data-grid').DataGrid;

/** DataGrid texts in the page language. */
function useGridLocale() {
  const t = useMessages('common');
  return React.useMemo(
    () => ({
      noRowsLabel: t.noResults,
      noResultsOverlayLabel: t.noResults,
      footerRowSelected: (count: number) => t.rowsSelected(count),
      MuiTablePagination: {
        labelRowsPerPage: t.rowsPerPage,
        labelDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) => t.displayedRows(from, to, count),
      },
    }),
    [t],
  );
}

interface ResponsiveTableProps<R extends GridValidRowModel> {
  rows: R[];
  columns: GridColDef<R>[];
  /** Card rendering used below the md breakpoint. */
  renderCard: (row: R) => React.ReactNode;
  loading?: boolean;
  pageSize?: number;
  onRowClick?: (row: R) => void;
  emptyState?: React.ReactNode;
  ariaLabel: string;
}

/** DataGrid on desktop, paginated card list on mobile. */
export function ResponsiveTable<R extends GridValidRowModel>({ rows, columns, renderCard, loading, pageSize = 10, onRowClick, emptyState, ariaLabel }: ResponsiveTableProps<R>) {
  const isMobile = useIsMobile();
  const t = useMessages('common');
  const localeText = useGridLocale();
  const [page, setPage] = React.useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  React.useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  if (!loading && rows.length === 0 && emptyState) return <>{emptyState}</>;

  if (isMobile) {
    if (loading) return <ListSkeleton rows={4} />;
    const visible = rows.slice((page - 1) * pageSize, page * pageSize);
    return (
      <Box aria-label={ariaLabel} role="list">
        <Box className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((row) => (
              <motion.div key={row.id as string} role="listitem" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className="p-4">{renderCard(row)}</Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
        {pageCount > 1 && (
          <Box className="mt-4 flex flex-col items-center gap-1">
            <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} color="primary" size="small" />
            <Typography variant="caption" color="text.secondary">
              {t.itemsCount(rows.length)}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Card className="overflow-hidden">
      <DataGrid
        aria-label={ariaLabel}
        rows={rows}
        columns={columns}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
        rowHeight={64}
        pageSizeOptions={[5, 10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize } } }}
        localeText={localeText}
        onRowClick={onRowClick ? (params: GridRowParams<R>) => onRowClick(params.row) : undefined}
        sx={{
          border: 0,
          '& .MuiDataGrid-columnHeaders': { backgroundColor: '#FBF6EC' },
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
          '& .MuiDataGrid-row': { cursor: onRowClick ? 'pointer' : 'default' },
          '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
        }}
      />
    </Card>
  );
}
