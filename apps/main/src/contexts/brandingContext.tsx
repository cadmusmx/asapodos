'use client'

import { createContext, useContext } from 'react'

import type { TenantBrandingSettings } from '@/types/tenant-settings'

const BrandingContext = createContext<TenantBrandingSettings | null>(null)

export const BrandingProvider = ({
  initialBranding,
  children
}: {
  initialBranding: TenantBrandingSettings | null
  children: React.ReactNode
}) => {
  return <BrandingContext.Provider value={initialBranding}>{children}</BrandingContext.Provider>
}

export const useInitialBranding = () => useContext(BrandingContext)
