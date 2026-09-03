import { getServerSession } from 'next-auth'

import { authOptions } from '@gaso/shared'

import type { Locale } from '@configs/i18n'
import type { ChildrenType } from '@core/types'

import AuthRedirect from '@/components/AuthRedirect'

export default async function AuthGuard({ children, locale }: ChildrenType & { locale: Locale }) {
  const session = await getServerSession(authOptions)

  return <>{session ? children : <AuthRedirect lang={locale} />}</>
}
