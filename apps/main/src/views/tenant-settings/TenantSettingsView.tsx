'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { useTenantSettings } from '@/hooks/useTenantSettings'

import type { TenantLimitSettings, TenantSettings } from '@/types/tenant-settings'

const parseNullableNumber = (value: string): number | null => {
    if (value.trim() === '') {
        return null
    }

    const parsedValue = Number(value)

    return Number.isFinite(parsedValue) && parsedValue >= 0
        ? parsedValue
        : null
}

const formatNullableNumber = (value: number | null): string => {
    return value === null ? '' : String(value)
}

const TenantSettingsView = () => {
    const {
        data,
        settings,
        isLoading,
        isSaving,
        error,
        saveSettings,
        reload
    } = useTenantSettings()

    const [formSettings, setFormSettings] =
        useState<TenantSettings>(settings)

    const [successMessage, setSuccessMessage] =
        useState<string | null>(null)

    useEffect(() => {
        setFormSettings(settings)
    }, [settings])

    const tenantName =
        data?.tenant.name ||
        data?.tenant.slug ||
        'Tenant actual'

    const updateBranding = <
        Key extends keyof TenantSettings['branding']
    >(
        key: Key,
        value: TenantSettings['branding'][Key]
    ) => {
        setFormSettings(current => ({
            ...current,
            branding: {
                ...current.branding,
                [key]: value
            }
        }))
    }

    const updateLimit = (
        key: keyof TenantLimitSettings,
        value: number | null
    ) => {
        setFormSettings(current => ({
            ...current,
            limits: {
                ...current.limits,
                [key]: value
            }
        }))
    }

    const handleSave = async () => {
        await saveSettings({
            settings: formSettings
        })

        setSuccessMessage(
            'Configuración del tenant guardada correctamente.'
        )
    }

    if (isLoading && !data) {
        return (
            <Card>
                <CardContent>
                    <Box className='flex items-center gap-3'>
                        <CircularProgress size={22} />

                        <Typography>
                            Cargando configuración del tenant...
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        )
    }

    return (
        <Box className='flex flex-col gap-6'>
            <Card>
                <CardHeader
                    title='Parámetros del tenant'
                    subheader={`Configura el branding y los límites operativos de ${tenantName}.`}
                />

                <CardContent>
                    <Box className='flex flex-col gap-4'>
                        {error ? (
                            <Alert
                                severity='error'
                                action={
                                    <Button
                                        color='inherit'
                                        size='small'
                                        onClick={reload}
                                    >
                                        Reintentar
                                    </Button>
                                }
                            >
                                {error}
                            </Alert>
                        ) : null}

                        <Alert severity='info'>
                            Estos parámetros aplican al tenant actual. Los módulos
                            disponibles se administran mediante el plan asignado al
                            tenant.
                        </Alert>
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardHeader
                    title='Branding'
                    subheader='Datos visuales básicos para identificar el tenant.'
                />

                <CardContent>
                    <Box className='flex flex-col gap-4'>
                        <TextField
                            fullWidth
                            label='Nombre visible'
                            value={formSettings.branding.displayName}
                            onChange={event =>
                                updateBranding(
                                    'displayName',
                                    event.target.value
                                )
                            }
                            placeholder={tenantName}
                        />

                        <TextField
                            fullWidth
                            label='URL del logo'
                            value={formSettings.branding.logoUrl ?? ''}
                            onChange={event =>
                                updateBranding(
                                    'logoUrl',
                                    event.target.value.trim() || null
                                )
                            }
                            placeholder='https://...'
                        />

                        <TextField
                            fullWidth
                            label='Color primario'
                            value={formSettings.branding.primaryColor ?? ''}
                            onChange={event =>
                                updateBranding(
                                    'primaryColor',
                                    event.target.value.trim() || null
                                )
                            }
                            placeholder='#7367F0'
                            helperText='Usa formato hexadecimal, por ejemplo #7367F0.'
                        />
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardHeader
                    title='Límites operativos'
                    subheader='Configura límites opcionales para el tenant. Un campo vacío representa que no existe un límite específico.'
                />

                <CardContent>
                    <Box className='flex flex-col gap-4'>
                        <TextField
                            fullWidth
                            type='number'
                            label='Máximo de usuarios'
                            value={formatNullableNumber(
                                formSettings.limits.maxUsers
                            )}
                            onChange={event =>
                                updateLimit(
                                    'maxUsers',
                                    parseNullableNumber(event.target.value)
                                )
                            }
                            slotProps={{
                                htmlInput: {
                                    min: 0
                                }
                            }}
                            placeholder='Sin límite'
                        />

                        <TextField
                            fullWidth
                            type='number'
                            label='Máximo de sucursales'
                            value={formatNullableNumber(
                                formSettings.limits.maxBranches
                            )}
                            onChange={event =>
                                updateLimit(
                                    'maxBranches',
                                    parseNullableNumber(event.target.value)
                                )
                            }
                            slotProps={{
                                htmlInput: {
                                    min: 0
                                }
                            }}
                            placeholder='Sin límite'
                        />

                        <TextField
                            fullWidth
                            type='number'
                            label='Almacenamiento máximo MB'
                            value={formatNullableNumber(
                                formSettings.limits.maxStorageMb
                            )}
                            onChange={event =>
                                updateLimit(
                                    'maxStorageMb',
                                    parseNullableNumber(event.target.value)
                                )
                            }
                            slotProps={{
                                htmlInput: {
                                    min: 0
                                }
                            }}
                            placeholder='Sin límite'
                        />

                        <TextField
                            fullWidth
                            type='number'
                            label='Máximo de proyectos'
                            value={formatNullableNumber(
                                formSettings.limits.maxProjects
                            )}
                            onChange={event =>
                                updateLimit(
                                    'maxProjects',
                                    parseNullableNumber(event.target.value)
                                )
                            }
                            slotProps={{
                                htmlInput: {
                                    min: 0
                                }
                            }}
                            placeholder='Sin límite'
                        />
                    </Box>
                </CardContent>
            </Card>

            <Box className='flex justify-end gap-3'>
                <Button
                    variant='outlined'
                    disabled={isSaving || isLoading}
                    onClick={reload}
                >
                    Recargar
                </Button>

                <Button
                    variant='contained'
                    disabled={isSaving || isLoading}
                    onClick={handleSave}
                >
                    {isSaving
                        ? 'Guardando...'
                        : 'Guardar configuración'}
                </Button>
            </Box>

            <Snackbar
                open={Boolean(successMessage)}
                autoHideDuration={3500}
                onClose={() => setSuccessMessage(null)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                }}
            >
                <Alert
                    severity='success'
                    variant='filled'
                    onClose={() => setSuccessMessage(null)}
                >
                    {successMessage}
                </Alert>
            </Snackbar>
        </Box>
    )
}

export default TenantSettingsView
