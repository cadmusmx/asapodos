// React Imports
import type { ReactElement } from 'react'

// Next Imports
import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'

// Component Imports
import { PERM } from '@gaso/shared'

import Settings from '@views/pages/settings'

// RBAC Imports
import { requireViewAccess, getTargetByReason } from '@/lib/auth/require-view-access'

import { getDictionary } from '@/utils/getDictionary'
import { getLocalizedUrl } from '@/utils/i18n'
import type { Locale } from '@configs/i18n'

const TenantSettingsTab = dynamic(() => import('@views/tenant-settings/TenantSettingsView'))
const TestingTab = dynamic(() => import('@views/pages/settings/testing'))

const tabContentList = (dictionary: any): { [key: string]: ReactElement } => ({
  'tenant-settings': <TenantSettingsTab dictionary={dictionary} />,
  testing: <TestingTab />
})

const SettingsPage = async ({ params }: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await params

  const access = await requireViewAccess('tenant_settings', PERM.R)

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang))
  }

  const dictionary = await getDictionary(lang)

  return <Settings tabContentList={tabContentList(dictionary)} />
}

export default SettingsPage
