export type MexicanVacationPeriodCalculation = {
    yearsCompleted: number
    assignedDays: number
    periodStart: string
    periodEnd: string
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/

const toUtcDateOnly = (value: Date | string): Date => {
    if (value instanceof Date) {
        return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
    }

    if (!DATE_ONLY_REGEX.test(value)) {
        throw new Error('Fecha inválida')
    }

    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        throw new Error('Fecha inválida')
    }

    return date
}

const formatDateOnly = (date: Date): string => date.toISOString().slice(0, 10)

const getLastDayOfMonth = (year: number, monthIndex: number): number =>
    new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

const addYears = (date: Date, years: number): Date => {
    const targetYear = date.getUTCFullYear() + years
    const month = date.getUTCMonth()
    const day = Math.min(date.getUTCDate(), getLastDayOfMonth(targetYear, month))

    return new Date(Date.UTC(targetYear, month, day))
}

const addDays = (date: Date, days: number): Date => {
    const copy = new Date(date)

    copy.setUTCDate(copy.getUTCDate() + days)

    return copy
}

export const calculateMexicanVacationDays = (yearsCompleted: number): number => {
    if (!Number.isInteger(yearsCompleted) || yearsCompleted < 1) return 0

    if (yearsCompleted <= 5) {
        return 10 + yearsCompleted * 2
    }

    return 20 + Math.ceil((yearsCompleted - 5) / 5) * 2
}

export const calculateCompletedServiceYears = (
    hireDateValue: Date | string,
    referenceDateValue: Date | string = new Date()
): number => {
    const hireDate = toUtcDateOnly(hireDateValue)
    const referenceDate = toUtcDateOnly(referenceDateValue)

    let yearsCompleted = referenceDate.getUTCFullYear() - hireDate.getUTCFullYear()
    const anniversaryThisYear = addYears(hireDate, yearsCompleted)

    if (referenceDate < anniversaryThisYear) {
        yearsCompleted -= 1
    }

    return Math.max(yearsCompleted, 0)
}

export const calculateCurrentMexicanVacationPeriod = (
    hireDateValue: Date | string,
    referenceDateValue: Date | string = new Date()
): MexicanVacationPeriodCalculation | null => {
    const hireDate = toUtcDateOnly(hireDateValue)
    const referenceDate = toUtcDateOnly(referenceDateValue)
    const yearsCompleted = calculateCompletedServiceYears(hireDate, referenceDate)

    if (yearsCompleted < 1) return null

    const periodStart = addYears(hireDate, yearsCompleted)
    const periodEnd = addDays(addYears(hireDate, yearsCompleted + 1), -1)
    const assignedDays = calculateMexicanVacationDays(yearsCompleted)

    return {
        yearsCompleted,
        assignedDays,
        periodStart: formatDateOnly(periodStart),
        periodEnd: formatDateOnly(periodEnd)
    }
}
