import { getDictionary } from '@/utils/getDictionary'
import type { Locale } from '@configs/i18n'
import StartView from './page.client'

type PageProps = {
  params: Promise<{ lang: Locale }>
}

const Start = async (props: PageProps) => {
  const { lang } = await props.params

  const dictionary = await getDictionary(lang)

  return <StartView dictionary={dictionary} locale={lang} />
}

export default Start
