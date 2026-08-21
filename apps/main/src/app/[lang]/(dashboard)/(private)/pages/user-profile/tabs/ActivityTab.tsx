'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'

import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

import { AUDIT_ACTION_LABELS } from '@gaso/shared'

import tableStyles from '@core/styles/table.module.css'

import AuditDetailDialog from '@/views/audit/AuditDetailDialog'
import { useTranslatePage } from '@/contexts/dictionaryContext'

import type { ProfileActivityResponse } from '@/types/profile'

type ActivityRow = {
  id: number
  tableName: string
  action: string
  actionLabel: string
  oldData: unknown | null
  newData: unknown | null
  changedAt: string
  appUser: string | null
  origin: string | null
}

type Props = {
  onError: (message: string) => void
}

const columnHelper = createColumnHelper<ActivityRow>()

const ActivityTab = ({ onError }: Props) => {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [detailRow, setDetailRow] = useState<ActivityRow | null>(null)
  const onErrorRef = useRef(onError)
  const { t } = useTranslatePage()

  onErrorRef.current = onError

  const columns = useMemo(
    () => [
      columnHelper.accessor('changedAt', {
        header: t('userProfile.activityTab.date'),
        cell: info => {
          const v = info.getValue()

          try {
            return new Date(v).toLocaleString('es-MX', { timeZone: 'UTC' })
          } catch {
            return v
          }
        }
      }),
      columnHelper.accessor('action', {
        header: t('userProfile.activityTab.action'),
        cell: info => {
          const code = info.getValue()
          const label = AUDIT_ACTION_LABELS[code as keyof typeof AUDIT_ACTION_LABELS] ?? code

          return <Chip size='small' variant='outlined' label={label} />
        }
      }),
      columnHelper.accessor('tableName', {
        header: t('userProfile.activityTab.entity'),
        cell: info => (
          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {info.getValue()}
          </Typography>
        )
      }),
      columnHelper.accessor('appUser', {
        header: t('userProfile.activityTab.user'),
        cell: info => info.getValue() ?? '—'
      }),
      columnHelper.accessor('origin', {
        header: t('userProfile.activityTab.origin'),
        cell: info => info.getValue() ?? '—'
      }),
      columnHelper.display({
        id: 'detail',
        header: t('userProfile.activityTab.detail'),
        cell: ({ row }) => {
          const r = row.original
          const hasOld = r.oldData != null
          const hasNew = r.newData != null

          if (!hasOld && !hasNew) return '—'

          const label = hasOld && hasNew ? t('userProfile.activityTab.viewChanges') : t('userProfile.activityTab.viewData')

          return (
            <Button
              size='small'
              variant='text'
              onClick={() => setDetailRow(r)}
            >
              {label}
            </Button>
          )
        }
      })
    ],
    []
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
    state: { pagination: { pageIndex: page, pageSize } }
  })

  const loadActivity = useCallback(async (pageNum: number) => {
    setLoading(true)

    try {
      const params = new URLSearchParams({
        page: String(pageNum + 1),
        pageSize: String(pageSize)
      })

      const res = await fetch(`/api/profile/activity?${params}`)
      const raw = await res.json().catch(() => null)

      if (!res.ok || !raw) {
        const err = raw as { message?: string } | null

        throw new Error(err?.message ?? t('userProfile.activityTab.errorLoading'))
      }

      const data = raw as ProfileActivityResponse

      setRows(data.data as ActivityRow[])
      setTotal(data.total)
    } catch (e) {
      onErrorRef.current(e instanceof Error ? e.message : t('userProfile.activityTab.errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    loadActivity(page)
  }, [page, loadActivity])

  return (
    <>
      <Box sx={{ position: 'relative' }}>
        <TableContainer component={Paper} variant='outlined'>
          <div className='overflow-x-auto'>
            <table className={tableStyles.table}>
              <TableHead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </TableHead>
              <TableBody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className='text-center' style={{ padding: '48px' }}>
                      <CircularProgress size={28} />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className='text-center' style={{ padding: '48px' }}>
                      <Box display='flex' flexDirection='column' alignItems='center' gap={1}>
                        <i
                          className='ri-history-line'
                          style={{ fontSize: '2rem', color: 'var(--mui-palette-text-disabled)' }}
                        />
                        <Typography variant='body2' color='text.secondary'>
                          {t('userProfile.activityTab.noActivity')}
                        </Typography>
                      </Box>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </TableBody>
            </table>
          </div>

          {loading && rows.length > 0 && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.6)',
                zIndex: 1
              }}
            >
              <CircularProgress size={28} />
            </Box>
          )}
        </TableContainer>

        <TablePagination
          component='div'
          count={total}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 25, 50, 100]}
          onPageChange={(_e, value) => setPage(value)}
          onRowsPerPageChange={e => {
            setPageSize(Number(e.target.value))
            setPage(0)
          }}
          labelRowsPerPage={t('userProfile.activityTab.rowsPerPage')}
        />
      </Box>

      <AuditDetailDialog
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        oldData={detailRow ? JSON.stringify(detailRow.oldData, null, 2) : null}
        newData={detailRow ? JSON.stringify(detailRow.newData, null, 2) : null}
      />
    </>
  )
}

export default ActivityTab
