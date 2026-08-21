export const getDictionaryValue = (dictionary: any, path: string): string => {
  const value = path.split('.').reduce((currentValue, currentKey) => currentValue?.[currentKey], dictionary?.navigation)

  if (typeof value !== 'string') {
    return path
  }

  return value
}
