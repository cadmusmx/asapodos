import type {
    InventoryItemPayload,
    InventoryMaintenanceListFilters,
    InventorySkuListFilters,
    InventorySkuPayload
} from '@/types/inventory-maintenance'

type UnknownRecord = Record<string, unknown>

export class InventoryMaintenanceValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'InventoryMaintenanceValidationError'
    }
}

const isRecord = (value: unknown): value is UnknownRecord =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)

const normalizeSingleLine = (
    value: unknown,
    fieldName: string,
    maxLength: number,
    required = false
): string | null => {
    if (value === null || value === undefined) {
        if (required) {
            throw new InventoryMaintenanceValidationError(
                `${fieldName} es obligatorio.`
            )
        }

        return null
    }

    if (typeof value !== 'string') {
        throw new InventoryMaintenanceValidationError(
            `${fieldName} debe ser texto.`
        )
    }

    const normalized = value
        .trim()
        .replace(/\s+/g, ' ')

    if (!normalized) {
        if (required) {
            throw new InventoryMaintenanceValidationError(
                `${fieldName} es obligatorio.`
            )
        }

        return null
    }

    if (normalized.length > maxLength) {
        throw new InventoryMaintenanceValidationError(
            `${fieldName} no puede superar ${maxLength} caracteres.`
        )
    }

    return normalized
}

const normalizeMultiline = (
    value: unknown,
    fieldName: string,
    maxLength: number
): string | null => {
    if (value === null || value === undefined) {
        return null
    }

    if (typeof value !== 'string') {
        throw new InventoryMaintenanceValidationError(
            `${fieldName} debe ser texto.`
        )
    }

    const normalized = value.trim()

    if (!normalized) {
        return null
    }

    if (normalized.length > maxLength) {
        throw new InventoryMaintenanceValidationError(
            `${fieldName} no puede superar ${maxLength} caracteres.`
        )
    }

    return normalized
}

const parseOptionalBoolean = (
    value: unknown,
    fieldName: string
): boolean | undefined => {
    if (value === undefined) {
        return undefined
    }

    if (typeof value !== 'boolean') {
        throw new InventoryMaintenanceValidationError(
            `${fieldName} debe ser verdadero o falso.`
        )
    }

    return value
}

const parseRequiredPositiveInteger = (
    value: unknown,
    fieldName: string
): number => {
    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new InventoryMaintenanceValidationError(
            `${fieldName} debe ser un entero mayor que cero.`
        )
    }

    return parsed
}

const parsePositiveIntegerQuery = (
    value: string | null,
    fallback: number,
    max: number
): number => {
    if (!value) {
        return fallback
    }

    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback
    }

    return Math.min(parsed, max)
}

const parseOptionalPositiveIntegerQuery = (
    value: string | null,
    fieldName: string
): number | null => {
    if (value === null || value === '') {
        return null
    }

    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new InventoryMaintenanceValidationError(
            `${fieldName} debe ser un entero mayor que cero.`
        )
    }

    return parsed
}

const parseActiveFilter = (
    value: string | null
): boolean | null => {
    if (value === null || value === '') {
        return null
    }

    if (value === 'true') {
        return true
    }

    if (value === 'false') {
        return false
    }

    throw new InventoryMaintenanceValidationError(
        'El filtro active debe ser true o false.'
    )
}

const normalizeUpperIdentifier = (
    value: unknown,
    fieldName: string,
    maxLength: number,
    required = false
): string | null => {
    const normalized = normalizeSingleLine(
        value,
        fieldName,
        maxLength,
        required
    )

    return normalized
        ? normalized.toUpperCase()
        : null
}

export const buildInventorySearchPattern = (
    value: string | null
): string | null => {
    if (!value) {
        return null
    }

    const trimmed = value.trim()

    if (!trimmed) {
        return null
    }

    const escaped = trimmed
        .replace(/\|/g, '||')
        .replace(/%/g, '|%')
        .replace(/_/g, '|_')
        .replace(/\[/g, '|[')
        .replace(/\]/g, '|]')

    return `%${escaped}%`
}

export const parseInventoryItemPayload = (
    body: unknown
): InventoryItemPayload => {
    if (!isRecord(body)) {
        throw new InventoryMaintenanceValidationError(
            'El cuerpo de la solicitud no es válido.'
        )
    }

    const name = normalizeSingleLine(
        body.name,
        'El nombre del artículo',
        200,
        true
    )

    if (!name) {
        throw new InventoryMaintenanceValidationError(
            'El nombre del artículo es obligatorio.'
        )
    }

    return {
        name,
        description: normalizeMultiline(
            body.description,
            'La descripción',
            1000
        ),
        category: normalizeSingleLine(
            body.category,
            'La categoría',
            120
        ),
        manufacturer: normalizeSingleLine(
            body.manufacturer,
            'El fabricante',
            120
        ),
        isActive:
            parseOptionalBoolean(
                body.isActive,
                'El estado activo'
            ) ?? true
    }
}

export const parseInventorySkuPayload = (
    body: unknown
): InventorySkuPayload => {
    if (!isRecord(body)) {
        throw new InventoryMaintenanceValidationError(
            'El cuerpo de la solicitud no es válido.'
        )
    }

    const skuCode = normalizeUpperIdentifier(
        body.skuCode,
        'El código SKU',
        100,
        true
    )

    if (!skuCode) {
        throw new InventoryMaintenanceValidationError(
            'El código SKU es obligatorio.'
        )
    }

    const unitOfMeasure =
        normalizeUpperIdentifier(
            body.unitOfMeasure,
            'La unidad de medida',
            30
        ) ?? 'PIECE'

    return {
        itemId: parseRequiredPositiveInteger(
            body.itemId,
            'El artículo'
        ),
        skuCode,
        manufacturerPartNumber:
            normalizeUpperIdentifier(
                body.manufacturerPartNumber,
                'El número de parte del fabricante',
                100
            ),
        unitOfMeasure,
        isSerialized:
            parseOptionalBoolean(
                body.isSerialized,
                'El seguimiento por serial'
            ) ?? false,
        isLotTracked:
            parseOptionalBoolean(
                body.isLotTracked,
                'El seguimiento por lote'
            ) ?? false,
        isPalletTracked:
            parseOptionalBoolean(
                body.isPalletTracked,
                'El seguimiento por pallet'
            ) ?? false,
        allowsReverseLogistics:
            parseOptionalBoolean(
                body.allowsReverseLogistics,
                'La logística inversa'
            ) ?? false,
        isActive:
            parseOptionalBoolean(
                body.isActive,
                'El estado activo'
            ) ?? true
    }
}

export const parseInventoryMaintenanceListFilters = (
    searchParams: URLSearchParams
): InventoryMaintenanceListFilters => {
    const page = parsePositiveIntegerQuery(
        searchParams.get('page'),
        1,
        1_000_000
    )

    const pageSize = parsePositiveIntegerQuery(
        searchParams.get('pageSize'),
        25,
        100
    )

    return {
        searchPattern: buildInventorySearchPattern(
            searchParams.get('search')
        ),
        active: parseActiveFilter(
            searchParams.get('active')
        ),
        page,
        pageSize,
        offset: (page - 1) * pageSize
    }
}

export const parseInventorySkuListFilters = (
    searchParams: URLSearchParams
): InventorySkuListFilters => {
    const base =
        parseInventoryMaintenanceListFilters(
            searchParams
        )

    return {
        ...base,
        itemId: parseOptionalPositiveIntegerQuery(
            searchParams.get('itemId'),
            'El filtro itemId'
        )
    }
}

export const getPositiveIdFromRequest = (
    req: Request
): number | null => {
    const pathname = new URL(req.url).pathname

    const idRaw = pathname
        .split('/')
        .filter(Boolean)
        .pop()

    const id = Number(idRaw)

    return Number.isInteger(id) && id > 0
        ? id
        : null
}
