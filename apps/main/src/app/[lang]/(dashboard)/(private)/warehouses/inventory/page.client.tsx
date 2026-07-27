'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'

import InventoryFilters from '@/components/warehouses/inventory/InventoryFilters'
import InventorySummaryCards from '@/components/warehouses/inventory/InventorySummaryCards'
import InventoryTable from '@/components/warehouses/inventory/InventoryTable'

import type { InventoryActiveFilter } from '@/components/warehouses/inventory/InventoryFilters'
import type {
  InventoryCatalogsData,
  InventoryCatalogsResponse
} from '@/types/inventory-catalogs'
import type {
  InventoryListResponse,
  InventoryListSummary,
  InventoryStockListItem
} from '@/types/inventory'

type ApiErrorResponse = {
  message?: string
}

const getApiErrorMessage = (
  payload: unknown,
  fallback: string
): string => {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return fallback
}

const EMPTY_SUMMARY: InventoryListSummary = {
  totalRows: 0,
  totalSkus: 0,
  onHand: 0,
  reserved: 0,
  available: 0
}

const EMPTY_CATALOGS: InventoryCatalogsData = {
  warehouses: [],
  categories: [],
  stockStatuses: [],
  unitsOfMeasure: []
}

const InventoryView = () => {
  const [rows, setRows] = useState<InventoryStockListItem[]>([])

  const [summary, setSummary] =
    useState<InventoryListSummary>(EMPTY_SUMMARY)

  const [catalogs, setCatalogs] =
    useState<InventoryCatalogsData>(EMPTY_CATALOGS)

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState('all')
  const [stockStatus, setStockStatus] = useState('all')
  const [category, setCategory] = useState('all')

  const [active, setActive] =
    useState<InventoryActiveFilter>('true')

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)

  const [loading, setLoading] = useState(false)
  const [loadingCatalogs, setLoadingCatalogs] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestSequence = useRef(0)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchInput])

  const loadCatalogs = useCallback(async () => {
    setLoadingCatalogs(true)

    try {
      const response = await fetch(
        '/api/warehouses/inventory/catalogs'
      )

      const payload = (await response.json().catch(() => null)) as
        | InventoryCatalogsResponse
        | ApiErrorResponse
        | null

      if (
        !response.ok ||
        !payload ||
        !('data' in payload)
      ) {
        throw new Error(
          getApiErrorMessage(
            payload,
            'No se pudieron cargar los catálogos del inventario.'
          )
        )
      }

      setCatalogs(payload.data)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Error al cargar los catálogos.'
      )
    } finally {
      setLoadingCatalogs(false)
    }
  }, [])

  const loadInventory = useCallback(async () => {
    const currentRequest = requestSequence.current + 1

    requestSequence.current = currentRequest
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      params.set('page', String(page + 1))
      params.set('pageSize', String(pageSize))

      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      }

      if (warehouseId !== 'all') {
        params.set('warehouseId', warehouseId)
      }

      if (stockStatus !== 'all') {
        params.set('stockStatus', stockStatus)
      }

      if (category !== 'all') {
        params.set('category', category)
      }

      if (active !== 'all') {
        params.set('active', active)
      }

      const response = await fetch(
        `/api/warehouses/inventory?${params.toString()}`
      )

      const payload = (await response.json().catch(() => null)) as
        | InventoryListResponse
        | ApiErrorResponse
        | null

      if (
        !response.ok ||
        !payload ||
        !('data' in payload) ||
        !('summary' in payload) ||
        !('pagination' in payload)
      ) {
        throw new Error(
          getApiErrorMessage(
            payload,
            'No se pudo consultar el inventario.'
          )
        )
      }

      if (currentRequest !== requestSequence.current) {
        return
      }

      setRows(payload.data)
      setSummary(payload.summary)
      setTotal(payload.pagination.total)
    } catch (loadError) {
      if (currentRequest !== requestSequence.current) {
        return
      }

      setRows([])
      setSummary(EMPTY_SUMMARY)
      setTotal(0)
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Error al consultar el inventario.'
      )
    } finally {
      if (currentRequest === requestSequence.current) {
        setLoading(false)
      }
    }
  }, [
    active,
    category,
    debouncedSearch,
    page,
    pageSize,
    stockStatus,
    warehouseId
  ])

  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  const resetFilters = () => {
    setSearchInput('')
    setDebouncedSearch('')
    setWarehouseId('all')
    setStockStatus('all')
    setCategory('all')
    setActive('true')
    setPage(0)
  }

  const refreshData = () => {
    void Promise.all([
      loadCatalogs(),
      loadInventory()
    ])
  }

  return (
    <Box sx={{ p: 5 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant='h4'>
            Inventario
          </Typography>

          <Typography variant='body2' color='text.secondary'>
            Consulta de artículos, SKUs y existencias por almacén,
            estado y tenant.
          </Typography>
        </Box>

        <InventorySummaryCards
          summary={summary}
          loading={loading}
        />

        {error && (
          <Alert severity='error'>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Stack spacing={4}>
              <InventoryFilters
                catalogs={catalogs}
                search={searchInput}
                warehouseId={warehouseId}
                stockStatus={stockStatus}
                category={category}
                active={active}
                loading={loading || loadingCatalogs}
                onSearchChange={setSearchInput}
                onWarehouseChange={value => {
                  setWarehouseId(value)
                  setPage(0)
                }}
                onStockStatusChange={value => {
                  setStockStatus(value)
                  setPage(0)
                }}
                onCategoryChange={value => {
                  setCategory(value)
                  setPage(0)
                }}
                onActiveChange={value => {
                  setActive(value)
                  setPage(0)
                }}
                onReset={resetFilters}
                onRefresh={refreshData}
              />

              <Divider />

              <InventoryTable
                rows={rows}
                loading={loading}
              />

              <TablePagination
                component='div'
                count={total}
                page={page}
                rowsPerPage={pageSize}
                rowsPerPageOptions={[10, 25, 50, 100]}
                onPageChange={(_event, value) => {
                  setPage(value)
                }}
                onRowsPerPageChange={event => {
                  setPageSize(Number(event.target.value))
                  setPage(0)
                }}
              />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}

export default InventoryView
