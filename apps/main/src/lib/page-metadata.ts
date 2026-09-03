import { headers } from 'next/headers'

import type { Metadata } from 'next'

import { getTenantNameFromHeaders } from '@gaso/shared'

import { getPublicBranding } from '@/lib/tenant-settings/public-branding'

async function resolveTenantDisplayName(): Promise<string> {
  const h = await headers()
  const companyName = getTenantNameFromHeaders(h).trim()

  try {
    const branding = await getPublicBranding()
    const displayName = branding?.displayName?.trim() ?? ''

    return displayName || companyName || ''
  } catch {
    return companyName || ''
  }
}

export async function withTenantTitle(title: string, description?: string): Promise<Metadata> {
  const name = await resolveTenantDisplayName()

  return {
    title: name ? `${title} | ${name}` : title,
    ...(description ? { description } : {})
  }
}
