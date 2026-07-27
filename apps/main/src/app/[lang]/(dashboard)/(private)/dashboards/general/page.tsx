import { getDictionary } from '@/utils/getDictionary'
import type { Locale } from '@configs/i18n'
import GeneralDashboard from './page.client'

type PageProps = {
  params: Promise<{ lang: Locale }>
}

const Page = async (props: PageProps) => {
  const { lang } = await props.params

  const dictionary = await getDictionary(lang)

  return <GeneralDashboard dictionary={dictionary} />
}

export default Page
