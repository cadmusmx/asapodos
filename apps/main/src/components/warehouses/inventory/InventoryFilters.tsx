import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid2'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'

import { getInventoryStatusLabel } from '@/lib/inventory/presentation'

import type { InventoryCatalogsData } from '@/types/inventory-catalogs'

export type InventoryActiveFilter = 'all' | 'true' | 'false'

type InventoryFiltersProps = {
    catalogs: InventoryCatalogsData
    search: string
    warehouseId: string
    stockStatus: string
    category: string
    active: InventoryActiveFilter
    loading: boolean
    onSearchChange: (value: string) => void
    onWarehouseChange: (value: string) => void
    onStockStatusChange: (value: string) => void
    onCategoryChange: (value: string) => void
    onActiveChange: (value: InventoryActiveFilter) => void
    onReset: () => void
    onRefresh: () => void
}

const InventoryFilters = ({
    catalogs,
    search,
    warehouseId,
    stockStatus,
    category,
    active,
    loading,
    onSearchChange,
    onWarehouseChange,
    onStockStatusChange,
    onCategoryChange,
    onActiveChange,
    onReset,
    onRefresh
}: InventoryFiltersProps) => {
    return (
        <Grid container spacing={3} alignItems='center'>
            <Grid size={{ xs: 12, lg: 4 }}>
                <TextField
                    label='Buscar inventario'
                    value={search}
                    onChange={event => onSearchChange(event.target.value)}
                    placeholder='SKU, artículo, fabricante o almacén'
                    fullWidth
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <i className='ri-search-line' />
                                </InputAdornment>
                            )
                        }
                    }}
                />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
                <FormControl fullWidth>
                    <InputLabel id='inventory-warehouse-filter-label'>
                        Almacén
                    </InputLabel>

                    <Select
                        labelId='inventory-warehouse-filter-label'
                        label='Almacén'
                        value={warehouseId}
                        onChange={event => onWarehouseChange(event.target.value)}
                    >
                        <MenuItem value='all'>Todos</MenuItem>

                        {catalogs.warehouses.map(warehouse => (
                            <MenuItem
                                key={warehouse.id}
                                value={String(warehouse.id)}
                            >
                                {warehouse.code} · {warehouse.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
                <FormControl fullWidth>
                    <InputLabel id='inventory-status-filter-label'>
                        Estado
                    </InputLabel>

                    <Select
                        labelId='inventory-status-filter-label'
                        label='Estado'
                        value={stockStatus}
                        onChange={event => onStockStatusChange(event.target.value)}
                    >
                        <MenuItem value='all'>Todos</MenuItem>

                        {catalogs.stockStatuses.map(status => (
                            <MenuItem key={status.value} value={status.value}>
                                {getInventoryStatusLabel(status.value)} ({status.recordCount})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
                <FormControl fullWidth>
                    <InputLabel id='inventory-category-filter-label'>
                        Categoría
                    </InputLabel>

                    <Select
                        labelId='inventory-category-filter-label'
                        label='Categoría'
                        value={category}
                        onChange={event => onCategoryChange(event.target.value)}
                    >
                        <MenuItem value='all'>Todas</MenuItem>

                        {catalogs.categories.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
                <FormControl fullWidth>
                    <InputLabel id='inventory-active-filter-label'>
                        SKU
                    </InputLabel>

                    <Select
                        labelId='inventory-active-filter-label'
                        label='SKU'
                        value={active}
                        onChange={event =>
                            onActiveChange(
                                event.target.value as InventoryActiveFilter
                            )
                        }
                    >
                        <MenuItem value='true'>Activos</MenuItem>
                        <MenuItem value='false'>Inactivos</MenuItem>
                        <MenuItem value='all'>Todos</MenuItem>
                    </Select>
                </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
                <Grid container spacing={2} justifyContent='flex-end'>
                    <Grid>
                        <Button
                            variant='outlined'
                            startIcon={<i className='ri-filter-off-line' />}
                            onClick={onReset}
                        >
                            Limpiar filtros
                        </Button>
                    </Grid>

                    <Grid>
                        <Button
                            variant='contained'
                            startIcon={<i className='ri-refresh-line' />}
                            onClick={onRefresh}
                            disabled={loading}
                        >
                            Actualizar
                        </Button>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    )
}

export default InventoryFilters
