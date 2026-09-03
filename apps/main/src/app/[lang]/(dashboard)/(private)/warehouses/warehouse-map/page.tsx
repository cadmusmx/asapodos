import { redirect } from 'next/navigation'

import { PERM } from '@gaso/shared'

import type { Locale } from '@configs/i18n'

import { getDictionary } from '@/utils/getDictionary'
import { getLocalizedUrl } from '@/utils/i18n'
import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access'

import WarehousesView from './page.client'

type PageProps = {
  params: Promise<{ lang: Locale }>
}

const Page = async (props: PageProps) => {
  const { lang } = await props.params
  const access = await requireViewAccess('warehouses_map', PERM.R)

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang))
  }

  const dictionary = await getDictionary(lang)

  return <WarehousesView dictionary={dictionary} />
}

export default Page
