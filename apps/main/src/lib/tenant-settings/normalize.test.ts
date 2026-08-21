/* eslint-disable padding-line-between-statements */
import { describe, it, expect } from 'vitest'

describe('normalizeTenantSettingsFromRow', () => {
  it('round-trip preserves all branding fields including faviconUrl and fontFamily', async () => {
    const { normalizeTenantSettingsFromRow, serializeTenantSettings } = await import('@/lib/tenant-settings/normalize')

    const input = {
      branding: {
        displayName: 'Mi Empresa',
        logoUrl: 'https://s3.example.com/Pr/tenant-x/brand/logo/image.png',
        primaryColor: '#0f172a',
        faviconUrl: 'https://s3.example.com/Pr/tenant-x/brand/favicon/icon.png',
        fontFamily: 'Geist'
      },
      limits: {
        maxUsers: 10,
        maxBranches: 2,
        maxStorageMb: 5000,
        maxProjects: null
      }
    }

    const row = {
      BrandingJson: JSON.stringify(input.branding),
      LimitsJson: JSON.stringify(input.limits)
    }

    const normalized = normalizeTenantSettingsFromRow(row)

    expect(normalized.branding.displayName).toBe('Mi Empresa')
    expect(normalized.branding.logoUrl).toBe(input.branding.logoUrl)
    expect(normalized.branding.primaryColor).toBe('#0f172a')
    expect(normalized.branding.faviconUrl).toBe(input.branding.faviconUrl)
    expect(normalized.branding.fontFamily).toBe('Geist')
    expect(normalized.limits.maxUsers).toBe(10)
    expect(normalized.limits.maxBranches).toBe(2)
    expect(normalized.limits.maxStorageMb).toBe(5000)
    expect(normalized.limits.maxProjects).toBe(null)

    const serialized = serializeTenantSettings(normalized)
    const reparsed = JSON.parse(serialized.brandingJson)
    expect(reparsed.faviconUrl).toBe(input.branding.faviconUrl)
    expect(reparsed.fontFamily).toBe('Geist')
  })

  it('faviconUrl defaults to null when missing from JSON', async () => {
    const { normalizeTenantSettingsFromRow } = await import('@/lib/tenant-settings/normalize')

    const row = {
      BrandingJson: JSON.stringify({ displayName: 'Test', logoUrl: null, primaryColor: null }),
      LimitsJson: JSON.stringify({})
    }

    const normalized = normalizeTenantSettingsFromRow(row)
    expect(normalized.branding.faviconUrl).toBe(null)
  })

  it('returns full defaults when BrandingJson is null', async () => {
    const { normalizeTenantSettingsFromRow } = await import('@/lib/tenant-settings/normalize')
    const { defaultTenantSettings } = await import('@/lib/tenant-settings/defaults')

    const normalized = normalizeTenantSettingsFromRow(null)
    expect(normalized).toEqual(defaultTenantSettings)
  })

  it('returns full defaults when BrandingJson is invalid JSON', async () => {
    const { normalizeTenantSettingsFromRow } = await import('@/lib/tenant-settings/normalize')
    const { defaultTenantSettings } = await import('@/lib/tenant-settings/defaults')

    const normalized = normalizeTenantSettingsFromRow({ BrandingJson: 'not-json', LimitsJson: '{}' } as any)
    expect(normalized.branding.displayName).toBe(defaultTenantSettings.branding.displayName)
  })
})

describe('normalizePrimaryColor', () => {
  it('accepts valid #RRGGBB hex', async () => {
    const { normalizePrimaryColor } = await import('@/lib/tenant-settings/normalize')
    expect(normalizePrimaryColor('#0f172a')).toBe('#0f172a')
    expect(normalizePrimaryColor('#aabbcc')).toBe('#aabbcc')
    expect(normalizePrimaryColor('#ABCDEF')).toBe('#abcdef')
  })

  it('accepts valid #RGB hex', async () => {
    const { normalizePrimaryColor } = await import('@/lib/tenant-settings/normalize')
    expect(normalizePrimaryColor('#fff')).toBe('#fff')
    expect(normalizePrimaryColor('#abc')).toBe('#abc')
    expect(normalizePrimaryColor('#AbC')).toBe('#abc')
  })

  it('returns null for invalid hex values', async () => {
    const { normalizePrimaryColor } = await import('@/lib/tenant-settings/normalize')
    expect(normalizePrimaryColor('not-a-color')).toBe(null)
    expect(normalizePrimaryColor('#gggggg')).toBe(null)
    expect(normalizePrimaryColor('#12345')).toBe(null)
    expect(normalizePrimaryColor('red')).toBe(null)
  })

  it('returns null for null/undefined/empty', async () => {
    const { normalizePrimaryColor } = await import('@/lib/tenant-settings/normalize')
    expect(normalizePrimaryColor(null)).toBe(null)
    expect(normalizePrimaryColor('')).toBe(null)
    expect(normalizePrimaryColor('   ')).toBe(null)
  })

  it('trims whitespace', async () => {
    const { normalizePrimaryColor } = await import('@/lib/tenant-settings/normalize')
    expect(normalizePrimaryColor('  #0f172a  ')).toBe('#0f172a')
  })

  it('invalidates colors without # prefix', async () => {
    const { normalizePrimaryColor } = await import('@/lib/tenant-settings/normalize')
    expect(normalizePrimaryColor('0f172a')).toBe(null)
  })
})
