import type { Locale } from '@configs/i18n'

import { getDictionary } from '@/utils/getDictionary'

import WarehousesView from './page.client'

type PageProps = {
  params: Promise<{ lang: Locale }>
}

const Page = async (props: PageProps) => {
  const { lang } = await props.params
  const dictionary = await getDictionary(lang)

  return <WarehousesView dictionary={dictionary} />
}

export default Page
