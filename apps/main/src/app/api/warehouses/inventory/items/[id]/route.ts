import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import {
    PERM,
    withPermission,
    writeTransactionLog
} from '@gaso/shared'

import {
    getInventoryItemById
} from '@/lib/inventory/maintenance'
import {
    getPositiveIdFromRequest,
    parseInventoryItemPayload
} from '@/lib/inventory/validation'
import { withTenantContext } from '@/lib/tenant-context'

export const runtime = 'nodejs'

export const GET = withPermission(
    'inventory',
    async (req, { tenantId }) => {
        const itemId = getPositiveIdFromRequest(req)

        if (!itemId) {
            return NextResponse.json(
                { message: 'Artículo inválido.' },
                { status: 400 }
            )
        }

        try {
            const item = await withTenantContext(
                tenantId,
                tx => getInventoryItemById(
                    tx,
                    tenantId,
                    itemId
                )
            )

            if (!item) {
                return NextResponse.json(
                    {
                        message:
                            'Artículo no encontrado.'
                    },
                    { status: 404 }
                )
            }

            return NextResponse.json({ data: item })
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'UNKNOWN_ERROR'

            console.error(
                '[INVENTORY_ITEM_DETAIL_ERROR]',
                { message }
            )

            return NextResponse.json(
                {
                    message:
                        'Error al consultar el artículo.'
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
        const itemId = getPositiveIdFromRequest(req)

        if (!itemId) {
            return NextResponse.json(
                { message: 'Artículo inválido.' },
                { status: 400 }
            )
        }

        let payload

        try {
            payload = parseInventoryItemPayload(
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
                    const oldItem =
                        await getInventoryItemById(
                            tx,
                            tenantId,
                            itemId
                        )

                    if (!oldItem) {
                        return null
                    }

                    await tx.$executeRaw(
                        Prisma.sql`
                            UPDATE Inventory.Items
                            SET
                                Name =
                                    ${payload.name},
                                Description =
                                    ${payload.description},
                                Category =
                                    ${payload.category},
                                Manufacturer =
                                    ${payload.manufacturer},
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
                              AND ItemID =
                                ${itemId}
                        `
                    )

                    const newItem =
                        await getInventoryItemById(
                            tx,
                            tenantId,
                            itemId
                        )

                    return {
                        oldItem,
                        newItem
                    }
                }
            )

            if (!result?.newItem) {
                return NextResponse.json(
                    {
                        message:
                            'Artículo no encontrado.'
                    },
                    { status: 404 }
                )
            }

            const action =
                !result.oldItem.isActive &&
                    result.newItem.isActive
                    ? 'REACTIVATE'
                    : 'UPDATE'

            writeTransactionLog({
                tenantId,
                tableName: 'Inventory.Items',
                action,
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: result.oldItem,
                newData: result.newItem
            }).catch(() => { })

            return NextResponse.json({
                data: result.newItem
            })
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'UNKNOWN_ERROR'

            console.error(
                '[INVENTORY_ITEM_UPDATE_ERROR]',
                { message }
            )

            return NextResponse.json(
                {
                    message:
                        'Error al actualizar el artículo.'
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
        const itemId = getPositiveIdFromRequest(req)

        if (!itemId) {
            return NextResponse.json(
                { message: 'Artículo inválido.' },
                { status: 400 }
            )
        }

        try {
            const result = await withTenantContext(
                tenantId,
                async tx => {
                    const oldItem =
                        await getInventoryItemById(
                            tx,
                            tenantId,
                            itemId
                        )

                    if (!oldItem) {
                        return {
                            status: 'NOT_FOUND' as const
                        }
                    }

                    if (oldItem.activeSkuCount > 0) {
                        return {
                            status:
                                'HAS_ACTIVE_SKUS' as const,
                            oldItem
                        }
                    }

                    if (!oldItem.isActive) {
                        return {
                            status:
                                'ALREADY_INACTIVE' as const,
                            oldItem,
                            newItem: oldItem
                        }
                    }

                    await tx.$executeRaw(
                        Prisma.sql`
                            UPDATE Inventory.Items
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
                              AND ItemID =
                                ${itemId}
                        `
                    )

                    const newItem =
                        await getInventoryItemById(
                            tx,
                            tenantId,
                            itemId
                        )

                    return {
                        status:
                            'DEACTIVATED' as const,
                        oldItem,
                        newItem
                    }
                }
            )

            if (result.status === 'NOT_FOUND') {
                return NextResponse.json(
                    {
                        message:
                            'Artículo no encontrado.'
                    },
                    { status: 404 }
                )
            }

            if (
                result.status === 'HAS_ACTIVE_SKUS'
            ) {
                return NextResponse.json(
                    {
                        message:
                            'No se puede desactivar el artículo porque tiene SKUs activos.',
                        activeSkuCount:
                            result.oldItem.activeSkuCount
                    },
                    { status: 409 }
                )
            }

            if (
                result.status === 'ALREADY_INACTIVE'
            ) {
                return NextResponse.json({
                    data: result.newItem
                })
            }

            if (!result.newItem) {
                throw new Error(
                    'INVENTORY_ITEM_READ_AFTER_DEACTIVATE_FAILED'
                )
            }

            writeTransactionLog({
                tenantId,
                tableName: 'Inventory.Items',
                action: 'DEACTIVATE',
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: result.oldItem,
                newData: result.newItem
            }).catch(() => { })

            return NextResponse.json({
                data: result.newItem
            })
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'UNKNOWN_ERROR'

            console.error(
                '[INVENTORY_ITEM_DEACTIVATE_ERROR]',
                { message }
            )

            return NextResponse.json(
                {
                    message:
                        'Error al desactivar el artículo.'
                },
                { status: 500 }
            )
        }
    },
    { bit: PERM.D }
)
