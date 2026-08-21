import { describe, it, expect } from 'vitest'

import { LOGO_ALLOWED, FAVICON_ALLOWED, LOGO_MAX_BYTES, FAVICON_MAX_BYTES } from '@/lib/tenant-settings/upload'

describe('S3 helper constants', () => {
  it('logo allowed extensions', () => {
    expect(LOGO_ALLOWED).toContain('.png')
    expect(LOGO_ALLOWED).toContain('.jpg')
    expect(LOGO_ALLOWED).toContain('.jpeg')
    expect(LOGO_ALLOWED).toContain('.svg')
    expect(LOGO_ALLOWED).toContain('.webp')
    expect(LOGO_ALLOWED).not.toContain('.ico')
  })

  it('favicon allowed extensions', () => {
    expect(FAVICON_ALLOWED).toContain('.png')
    expect(FAVICON_ALLOWED).toContain('.ico')
    expect(FAVICON_ALLOWED).toContain('.svg')
    expect(FAVICON_ALLOWED).not.toContain('.jpg')
    expect(FAVICON_ALLOWED).not.toContain('.webp')
  })

  it('logo max 5 MB', () => {
    expect(LOGO_MAX_BYTES).toBe(5 * 1024 * 1024)
  })

  it('favicon max 1 MB', () => {
    expect(FAVICON_MAX_BYTES).toBe(1 * 1024 * 1024)
  })
})
