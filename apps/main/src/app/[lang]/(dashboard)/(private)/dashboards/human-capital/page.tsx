import { getDictionary } from '@/utils/getDictionary'
import type { Locale } from '@configs/i18n'
import HumanCapitalDashboard from './page.client'

type PageProps = {
  params: Promise<{ lang: Locale }>
}

const Page = async (props: PageProps) => {
  const { lang } = await props.params

  const dictionary = await getDictionary(lang)

  return <HumanCapitalDashboard dictionary={dictionary} />
}

export default Page
