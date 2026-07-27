import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import {
    PERM,
    withPermission,
    writeTransactionLog
} from '@gaso/shared'

import {
    getInventoryItemStateById,
    getInventorySkuById
} from '@/lib/inventory/maintenance'
import {
    getPositiveIdFromRequest,
    parseInventorySkuPayload
} from '@/lib/inventory/validation'
import { withTenantContext } from '@/lib/tenant-context'

import type {
    InventorySkuMaintenance,
    InventorySkuPayload
} from '@/types/inventory-maintenance'

export const runtime = 'nodejs'

const hasProtectedStructureChanged = (
    current: InventorySkuMaintenance,
    payload: InventorySkuPayload
): boolean =>
    current.itemId !== payload.itemId ||
    current.unitOfMeasure !== payload.unitOfMeasure ||
    current.isSerialized !== payload.isSerialized ||
    current.isLotTracked !== payload.isLotTracked ||
    current.isPalletTracked !== payload.isPalletTracked

export const GET = withPermission(
    'inventory',
    async (req, { tenantId }) => {
        const skuId = getPositiveIdFromRequest(req)

        if (!skuId) {
            return NextResponse.json(
                { message: 'SKU inválido.' },
                { status: 400 }
            )
        }

        try {
            const sku = await withTenantContext(
                tenantId,
                tx => getInventorySkuById(
                    tx,
                    tenantId,
                    skuId
                )
            )

            if (!sku) {
                return NextResponse.json(
                    { message: 'SKU no encontrado.' },
                    { status: 404 }
                )
            }

            return NextResponse.json({ data: sku })
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'UNKNOWN_ERROR'

            console.error(
                '[INVENTORY_SKU_DETAIL_ERROR]',
                { message }
            )

            return NextResponse.json(
                {
                    message:
                        'Error al consultar el SKU.'
                },
                { status: 500 }
            )
        }
    },
    { bit: PERM.R }
)

export const PUT = withPermission(
    'inventory',
    async (req, { auth, tenantId }) => {
        const skuId = getPositiveIdFromRequest(req)

        if (!skuId) {
            return NextResponse.json(
                { message: 'SKU inválido.' },
                { status: 400 }
            )
        }

        let payload: ReturnType<
            typeof parseInventorySkuPayload
        >

        try {
            payload = parseInventorySkuPayload(
                await req.json()
            )
        } catch (error) {
            return NextResponse.json(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Body inválido.'
                },
                { status: 400 }
            )
        }

        try {
            const result = await withTenantContext(
                tenantId,
                async tx => {
                    const oldSku =
                        await getInventorySkuById(
                            tx,
                            tenantId,
                            skuId
                        )

                    if (!oldSku) {
                        return {
                            status:
                                'NOT_FOUND' as const
                        }
                    }

                    const item =
                        await getInventoryItemStateById(
                            tx,
                            tenantId,
                            payload.itemId
                        )

                    if (!item) {
                        return {
                            status:
                                'ITEM_NOT_FOUND' as const
                        }
                    }

                    if (!Boolean(item.IsActive)) {
                        return {
                            status:
                                'ITEM_INACTIVE' as const,
                            itemName: item.Name
                        }
                    }

                    if (
                        oldSku.stockRecordCount > 0 &&
                        hasProtectedStructureChanged(
                            oldSku,
                            payload
                        )
                    ) {
                        return {
                            status:
                                'STRUCTURE_LOCKED' as const,
                            oldSku
                        }
                    }

                    await tx.$executeRaw(
                        Prisma.sql`
                            UPDATE Inventory.SKUs
                            SET
                                ItemID =
                                    ${payload.itemId},
                                SkuCode =
                                    ${payload.skuCode},
                                ManufacturerPartNumber =
                                    ${payload.manufacturerPartNumber},
                                UnitOfMeasure =
                                    ${payload.unitOfMeasure},
                                IsSerialized =
                                    ${payload.isSerialized ? 1 : 0},
                                IsLotTracked =
                                    ${payload.isLotTracked ? 1 : 0},
                                IsPalletTracked =
                                    ${payload.isPalletTracked ? 1 : 0},
                                AllowsReverseLogistics =
                                    ${payload.allowsReverseLogistics ? 1 : 0},
                                IsActive =
                                    CASE
                                        WHEN IsActive = 0
                                         AND ${payload.isActive ? 1 : 0} = 1
                                            THEN 1
                                        ELSE IsActive
                                    END,
                                UpdatedAt =
                                    SYSUTCDATETIME(),
                                UpdatedBy =
                                    ${auth.userId}
                            WHERE TenantID =
                                CAST(
                                    ${tenantId}
                                    AS uniqueidentifier
                                )
                              AND SkuID =
                                ${skuId}
                        `
                    )

                    const newSku =
                        await getInventorySkuById(
                            tx,
                            tenantId,
                            skuId
                        )

                    if (!newSku) {
                        throw new Error(
                            'INVENTORY_SKU_READ_AFTER_UPDATE_FAILED'
                        )
                    }

                    return {
                        status: 'UPDATED' as const,
                        oldSku,
                        newSku
                    }
                }
            )

            if (result.status === 'NOT_FOUND') {
                return NextResponse.json(
                    { message: 'SKU no encontrado.' },
                    { status: 404 }
                )
            }

            if (
                result.status === 'ITEM_NOT_FOUND'
            ) {
                return NextResponse.json(
                    {
                        message:
                            'El artículo seleccionado no existe.'
                    },
                    { status: 404 }
                )
            }

            if (
                result.status === 'ITEM_INACTIVE'
            ) {
                return NextResponse.json(
                    {
                        message:
                            `El artículo "${result.itemName}" está inactivo.`
                    },
                    { status: 409 }
                )
            }

            if (
                result.status === 'STRUCTURE_LOCKED'
            ) {
                return NextResponse.json(
                    {
                        message:
                            'No se puede cambiar el artículo, la unidad de medida ni la configuración de seguimiento porque el SKU ya tiene registros de stock.',
                        stockRecordCount:
                            result.oldSku.stockRecordCount
                    },
                    { status: 409 }
                )
            }

            const action =
                !result.oldSku.isActive &&
                    result.newSku.isActive
                    ? 'REACTIVATE'
                    : 'UPDATE'

            writeTransactionLog({
                tenantId,
                tableName: 'Inventory.SKUs',
                action,
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: result.oldSku,
                newData: result.newSku
            }).catch(() => { })

            return NextResponse.json({
                data: result.newSku
            })
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'UNKNOWN_ERROR'

            if (
                message.includes(
                    'UX_Inventory_SKUs_Tenant_Code'
                )
            ) {
                return NextResponse.json(
                    {
                        message:
                            'Ya existe un SKU con ese código.'
                    },
                    { status: 409 }
                )
            }

            console.error(
                '[INVENTORY_SKU_UPDATE_ERROR]',
                { message }
            )

            return NextResponse.json(
                {
                    message:
                        'Error al actualizar el SKU.'
                },
                { status: 500 }
            )
        }
    },
    { bit: PERM.U }
)

export const DELETE = withPermission(
    'inventory',
    async (req, { auth, tenantId }) => {
        const skuId = getPositiveIdFromRequest(req)

        if (!skuId) {
            return NextResponse.json(
                { message: 'SKU inválido.' },
                { status: 400 }
            )
        }

        try {
            const result = await withTenantContext(
                tenantId,
                async tx => {
                    const oldSku =
                        await getInventorySkuById(
                            tx,
                            tenantId,
                            skuId
                        )

                    if (!oldSku) {
                        return {
                            status:
                                'NOT_FOUND' as const
                        }
                    }

                    if (!oldSku.isActive) {
                        return {
                            status:
                                'ALREADY_INACTIVE' as const,
                            oldSku,
                            newSku: oldSku
                        }
                    }

                    if (
                        oldSku.onHandQuantity > 0 ||
                        oldSku.reservedQuantity > 0
                    ) {
                        return {
                            status:
                                'HAS_STOCK' as const,
                            oldSku
                        }
                    }

                    await tx.$executeRaw(
                        Prisma.sql`
                            UPDATE Inventory.SKUs
                            SET
                                IsActive = 0,
                                UpdatedAt =
                                    SYSUTCDATETIME(),
                                UpdatedBy =
                                    ${auth.userId}
                            WHERE TenantID =
                                CAST(
                                    ${tenantId}
                                    AS uniqueidentifier
                                )
                              AND SkuID =
                                ${skuId}
                        `
                    )

                    const newSku =
                        await getInventorySkuById(
                            tx,
                            tenantId,
                            skuId
                        )

                    if (!newSku) {
                        throw new Error(
                            'INVENTORY_SKU_READ_AFTER_DEACTIVATE_FAILED'
                        )
                    }

                    return {
                        status:
                            'DEACTIVATED' as const,
                        oldSku,
                        newSku
                    }
                }
            )

            if (result.status === 'NOT_FOUND') {
                return NextResponse.json(
                    { message: 'SKU no encontrado.' },
                    { status: 404 }
                )
            }

            if (result.status === 'HAS_STOCK') {
                return NextResponse.json(
                    {
                        message:
                            'No se puede desactivar el SKU porque todavía tiene existencia o cantidades reservadas.',
                        onHandQuantity:
                            result.oldSku.onHandQuantity,
                        reservedQuantity:
                            result.oldSku.reservedQuantity,
                        availableQuantity:
                            result.oldSku.availableQuantity
                    },
                    { status: 409 }
                )
            }

            if (
                result.status ===
                'ALREADY_INACTIVE'
            ) {
                return NextResponse.json({
                    data: result.newSku
                })
            }

            writeTransactionLog({
                tenantId,
                tableName: 'Inventory.SKUs',
                action: 'DEACTIVATE',
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: result.oldSku,
                newData: result.newSku
            }).catch(() => { })

            return NextResponse.json({
                data: result.newSku
            })
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'UNKNOWN_ERROR'

            console.error(
                '[INVENTORY_SKU_DEACTIVATE_ERROR]',
                { message }
            )

            return NextResponse.json(
                {
                    message:
                        'Error al desactivar el SKU.'
                },
                { status: 500 }
            )
        }
    },
    { bit: PERM.D }
)
