'use client'

import { useCallback, useEffect, useState } from 'react'

import { defaultTenantSettings } from '@/lib/tenant-settings/defaults'

import type { TenantSettings, TenantSettingsResponse } from '@/types/tenant-settings'

type UseTenantSettingsState = {
    data: TenantSettingsResponse | null
    isLoading: boolean
    isSaving: boolean
    error: string | null
}

type SaveTenantSettingsParams = {
    settings: TenantSettings
}

export const useTenantSettings = () => {
    const [state, setState] = useState<UseTenantSettingsState>({
        data: null,
        isLoading: true,
        isSaving: false,
        error: null
    })

    const loadSettings = useCallback(async () => {
        setState(current => ({
            ...current,
            isLoading: true,
            error: null
        }))

        try {
            const response = await fetch('/api/admin/tenant-settings', {
                credentials: 'include',
                cache: 'no-store'
            })

            const data = (await response.json()) as TenantSettingsResponse | { message?: string }

            if (!response.ok) {
                throw new Error('message' in data && data.message ? data.message : 'No se pudo cargar la configuración')
            }

            setState(current => ({
                ...current,
                data: data as TenantSettingsResponse,
                isLoading: false,
                error: null
            }))
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo cargar la configuración'

            setState(current => ({
                ...current,
                data: current.data,
                isLoading: false,
                error: message
            }))
        }
    }, [])

    const saveSettings = useCallback(async ({ settings }: SaveTenantSettingsParams) => {
        setState(current => ({
            ...current,
            isSaving: true,
            error: null
        }))

        try {
            const response = await fetch('/api/admin/tenant-settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ settings })
            })

            const data = (await response.json()) as TenantSettingsResponse | { message?: string }

            if (!response.ok) {
                throw new Error('message' in data && data.message ? data.message : 'No se pudo guardar la configuración')
            }

            setState(current => ({
                ...current,
                data: data as TenantSettingsResponse,
                isSaving: false,
                error: null
            }))

            return data as TenantSettingsResponse
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo guardar la configuración'

            setState(current => ({
                ...current,
                isSaving: false,
                error: message
            }))

            throw error
        }
    }, [])

    useEffect(() => {
        loadSettings()
    }, [loadSettings])

    return {
        ...state,
        settings: state.data?.settings ?? defaultTenantSettings,
        reload: loadSettings,
        saveSettings
    }
}
