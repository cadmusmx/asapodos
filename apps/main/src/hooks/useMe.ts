'use client'

import { useEffect, useState } from 'react'

import type { MeResponse } from '@/types/me'

type UseMeState = {
    data: MeResponse | null
    isLoading: boolean
    error: string | null
}

export const useMe = (): UseMeState => {
    const [data, setData] = useState<MeResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        const loadMe = async () => {
            try {
                setIsLoading(true)
                setError(null)

                const response = await fetch('/api/me', {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store'
                })

                if (!response.ok) {
                    const body = await response.json().catch(() => null)

                    throw new Error(body?.message ?? 'No se pudo cargar la información del usuario')
                }

                const body = (await response.json()) as MeResponse

                if (isMounted) {
                    setData(body)
                }
            } catch (e) {
                if (isMounted) {
                    setError(e instanceof Error ? e.message : 'Error desconocido')
                    setData(null)
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadMe()

        return () => {
            isMounted = false
        }
    }, [])

    return {
        data,
        isLoading,
        error
    }
}
