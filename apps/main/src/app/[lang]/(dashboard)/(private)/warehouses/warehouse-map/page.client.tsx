'use client'

import WarehouseMapPage from '@/views/apps/warehouses/warehouse-map'

type Props = {
  dictionary: Record<string, any>
}

const WarehousesView = ({ dictionary }: Props) => {
  const t = (key: string): string => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], dictionary)

    if (typeof value !== 'string') {
      console.warn(`Translation key not found or not a string: ${key}`, value)

      return key
    }

    return value
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ''

  return <WarehouseMapPage mapboxToken={mapboxToken} t={t} />
}

export default WarehousesView
