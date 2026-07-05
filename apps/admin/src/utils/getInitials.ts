export const getInitials = (str: string) => {
  const words = str.trim().split(/\s+/)
  const initials = words.map(word => word.charAt(0).toUpperCase())
  if (initials.length > 2) {
    return initials.slice(0, 2).join('')
  }
  return initials.join('')
}
