import { redirect } from 'next/navigation'

import type { Locale } from '@configs/i18n'

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access'
import { getLocalizedUrl } from '@/utils/i18n'
import WarehousesView from './page.client'

const Page = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params
  const access = await requireViewAccess('material_logistics')

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  return <WarehousesView />
}

export default Page
