import { redirect } from 'next/navigation'

import { getServerSession } from 'next-auth'
import { authOptions } from '@gaso/shared'

import { getLocalizedUrl } from '@/utils/i18n'
import type { Locale } from '@configs/i18n'

import UserProfileView from './page.client'

const ProfilePage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params
  const session = await getServerSession(authOptions)

  if (!session?.user || typeof session.user.id !== 'number') {
    redirect(getLocalizedUrl('/login', lang))
  }

  return <UserProfileView />
}

export default ProfilePage
