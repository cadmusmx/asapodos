export type InventoryStatusColor =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning'

const STATUS_LABELS: Record<string, string> = {
    AVAILABLE: 'Disponible',
    QUARANTINE: 'Cuarentena',
    DAMAGED: 'Dañado',
    REVERSE_LOGISTICS: 'Logística inversa',
    REFURBISHED: 'Reacondicionado',
    SCRAP: 'Scrap',
    SPARE_PART: 'Refacción'
}

const STATUS_COLORS: Record<string, InventoryStatusColor> = {
    AVAILABLE: 'success',
    QUARANTINE: 'warning',
    DAMAGED: 'error',
    REVERSE_LOGISTICS: 'info',
    REFURBISHED: 'primary',
    SCRAP: 'error',
    SPARE_PART: 'secondary'
}

const quantityFormatter = new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 4
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
})

export const getInventoryStatusLabel = (value: string): string => {
    const normalized = value.trim().toUpperCase()

    if (!normalized) {
        return 'Sin estado'
    }

    if (STATUS_LABELS[normalized]) {
        return STATUS_LABELS[normalized]
    }

    return normalized
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

export const getInventoryStatusColor = (
    value: string
): InventoryStatusColor => {
    return STATUS_COLORS[value.trim().toUpperCase()] ?? 'default'
}

export const formatInventoryQuantity = (value: number): string => {
    return quantityFormatter.format(Number(value || 0))
}

export const formatInventoryDateTime = (value: string): string => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Fecha no disponible'
    }

    return dateTimeFormatter.format(date)
}
