import type { CapacityHistoryItem, HistoryGroup, HistoryPreset } from '@/types/warehouse-map'

export const ES_ERICSSON_REGEX = /E-NS$/i

export function esEricsson(nombre: string): boolean {
  return ES_ERICSSON_REGEX.test(String(nombre).trim().toUpperCase().replace(/\s+/g, ' '))
}

export function esGaso(nombre: string): boolean {
  return !esEricsson(nombre)
}

export function getCapacityColor(porcentaje: number): 'success' | 'warning' | 'error' {
  if (porcentaje >= 100) return 'error'
  if (porcentaje > 60) return 'warning'
  
return 'success'
}

export function getCapacityHex(porcentaje: number): string {
  if (porcentaje >= 100) return '#dc3545'
  if (porcentaje > 85) return '#e55300'
  if (porcentaje > 60) return '#ffc107'
  
return '#28a745'
}

export function parseDateISO(s: string): Date | null {
  const d = new Date(s)

  
return isNaN(d.getTime()) ? null : d
}

export function startOf(date: Date, group: HistoryGroup): Date {
  const d = new Date(date)

  if (group === 'week') {
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)

    
return new Date(d.setDate(diff))
  }

  if (group === 'month') {
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }

  
return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function labelOf(date: Date, group: HistoryGroup): string {
  const d = new Date(date)

  if (group === 'raw') {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (group === 'week') {
    const _start = startOf(d, 'week')

    
return `Sem ${getISOWeek(d)} ${d.getFullYear()}`
  }

  if (group === 'month') {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    
return `${months[d.getMonth()]} ${d.getFullYear()}`
  }

  
return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7

  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))

  
return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function groupSeries(raw: CapacityHistoryItem[], group: HistoryGroup): { d: Date; v: number }[] {
  if (group === 'raw') {
    const result = raw
      .map(r => {
        const d = parseDateISO(r.fecha_actualizacion)

        if (!d) return null
        const v = Number(r.capacidad_ocupada ?? 0)

        
return { d, v } as { d: Date; v: number }
      })
      .filter((x): x is { d: Date; v: number } => x !== null)
      .sort((a, b) => a.d.getTime() - b.d.getTime())

    
return result
  }

  const bucket = new Map<string, { d: Date; v: number }>()

  raw.forEach(r => {
    const d = parseDateISO(r.fecha_actualizacion)

    if (!d) return
    const keyStart = startOf(d, group)
    const key = keyStart.toISOString()
    const v = Number(r.capacidad_ocupada ?? 0)
    const prev = bucket.get(key)

    bucket.set(key, prev ? { ...prev, v } : { d: keyStart, v })
  })
  
return Array.from(bucket.values()).sort((a, b) => a.d.getTime() - b.d.getTime())
}

export function applyPreset(raw: CapacityHistoryItem[], preset: HistoryPreset): CapacityHistoryItem[] {
  if (!raw.length) return []
  const sorted = [...raw].sort((a, b) => new Date(a.fecha_actualizacion).getTime() - new Date(b.fecha_actualizacion).getTime())
  const now = new Date()

  if (preset === 'last4') return sorted.slice(-4)

  if (preset === '7d') {
    const cutoff = new Date(now)

    cutoff.setDate(cutoff.getDate() - 6)
    cutoff.setHours(0, 0, 0, 0)
    
return sorted.filter(x => {
      const d = parseDateISO(x.fecha_actualizacion)

      
return d !== null && d >= cutoff
    })
  }

  if (preset === 'thisMonth') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)

    
return sorted.filter(x => {
      const d = parseDateISO(x.fecha_actualizacion)

      
return d !== null && d >= from
    })
  }

  if (preset === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0)

    
return sorted.filter(x => {
      const d = parseDateISO(x.fecha_actualizacion)

      
return d !== null && d >= from && d <= to
    })
  }

  if (preset === '90d') {
    const cutoff = new Date(now)

    cutoff.setDate(cutoff.getDate() - 89)
    cutoff.setHours(0, 0, 0, 0)
    
return sorted.filter(x => {
      const d = parseDateISO(x.fecha_actualizacion)

      
return d !== null && d >= cutoff
    })
  }

  return sorted
}

export function applyRange(
  raw: CapacityHistoryItem[],
  range: { start: Date; end: Date } | null
): CapacityHistoryItem[] {
  if (!range) return raw
  const from = new Date(range.start)

  from.setHours(0, 0, 0, 0)
  const to = new Date(range.end)

  to.setHours(23, 59, 59, 999)
  
return raw.filter(x => {
    const d = parseDateISO(x.fecha_actualizacion)

    
return d !== null && d >= from && d <= to
  })
}
