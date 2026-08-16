function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

export function getCurrentYearRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = pad(now.getMonth() + 1)
  const day = pad(now.getDate())
  return {
    fechaInicio: `${year}-01-01`,
    fechaFin: `${year}-${month}-${day}`
  }
}
