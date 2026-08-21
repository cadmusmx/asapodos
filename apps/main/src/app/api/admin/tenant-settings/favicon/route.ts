import { NextResponse } from 'next/server'

import { withPermission, PERM, writeTransactionLog, getTenantSlugFromHeaders } from '@gaso/shared'

import { uploadBrandingAsset, InvalidBrandingAssetError } from '@/lib/tenant-settings/upload'

export const runtime = 'nodejs'

export const POST = withPermission(
  'tenant_settings',
  async (req, rbac) => {
    const { auth, tenantId } = rbac
    const userId = auth.userId

    const slug = getTenantSlugFromHeaders(req.headers) || tenantId

    try {
      const form = await req.formData().catch(() => null)
      const file = form?.get('file')

      if (!(file instanceof File)) {
        return NextResponse.json({ message: 'No se recibió ningún archivo' }, { status: 400 })
      }

      const { url } = await uploadBrandingAsset(slug, 'favicon', file)

      writeTransactionLog({
        tenantId,
        tableName: 'Security.TenantSettings',
        action: 'UPDATE',
        userId,
        appUser: auth.email ?? null,
        newData: { faviconUrl: url },
        idOrigin: 2
      }).catch(() => {})

      return NextResponse.json({ success: true, url })
    } catch (e) {
      if (e instanceof InvalidBrandingAssetError) {
        return NextResponse.json({ message: e.message }, { status: 400 })
      }

      console.error('[tenant-settings/favicon]', e)

      return NextResponse.json({ success: false, message: 'Error al subir el favicon' }, { status: 500 })
    }
  },
  { bit: PERM.U }
)
