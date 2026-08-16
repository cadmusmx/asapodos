'use client'

import { useRef, useCallback, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import GlobalStyles from '@mui/material/GlobalStyles'
import type { SxProps } from '@mui/material/styles'

import { Map, Source, Layer, Popup } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import type { MapLayerMouseEvent, GeoJSONSource } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import type { WarehouseMapItem, MapFilterType } from '@/types/warehouse-map'
import { esEricsson } from './warehouse-map-utils'

const MEXICO_CENTER: [number, number] = [-102.5528, 23.6345]
const INITIAL_ZOOM = 5

type Props = {
  warehouses: WarehouseMapItem[]
  filterType: MapFilterType
  onFilterChange: (type: MapFilterType) => void
  mapboxToken: string
  t: (key: string) => string
  onWarehouseClick: (nombre: string) => void
}

type PopupState = {
  warehouse: WarehouseMapItem
  longitude: number
  latitude: number
} | null

const WarehouseMapView = ({ warehouses, filterType, onFilterChange, mapboxToken, t }: Props) => {
  const mapRef = useRef<MapRef>(null)
  const [popup, setPopup] = useState<PopupState>(null)
  const [isHovering, setIsHovering] = useState(false)

  const filteredWarehouses = useMemo(() => {
    if (filterType === 'all') return warehouses
    if (filterType === 'gaso') return warehouses.filter(w => !esEricsson(w.Almacen))
    return warehouses.filter(w => esEricsson(w.Almacen))
  }, [warehouses, filterType])

  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredWarehouses
      .filter(w => w.Latitud != null && w.Longitud != null)
      .map(w => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [Number(w.Longitud), Number(w.Latitud)]
        },
        properties: {
          id: w.Id,
          name: w.Almacen,
          address: w.Direccion ?? 'No disponible',
          esEricsson: esEricsson(w.Almacen)
        }
      }))
  }), [filteredWarehouses])

  const gasoCount = useMemo(() => warehouses.filter(w => !esEricsson(w.Almacen)).length, [warehouses])
  const ericssonCount = useMemo(() => warehouses.filter(w => esEricsson(w.Almacen)).length, [warehouses])
  const totalCount = warehouses.length

  const clusterCountColor = (count: number): string => {
    if (count >= 20) return '#dc3545'
    if (count >= 10) return '#e55300'
    if (count >= 5) return '#ffc107'
    return '#28a745'
  }

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const features = e.features
    if (!features || features.length === 0) return
    const feature = features[0]

    if (feature.properties?.cluster) {
      const source = mapRef.current?.getSource('warehouses-source') as GeoJSONSource
      if (source) {
        source.getClusterExpansionZoom(feature.properties.cluster_id, (err, zoom) => {
          if (!err && zoom != null) {
            const geom = feature.geometry as { type: string; coordinates: [number, number] }
            mapRef.current?.flyTo({
              center: geom.coordinates,
              zoom: zoom
            })
          }
        })
      }
    } else {
      const warehouseId = feature.properties?.id
      const warehouse = filteredWarehouses.find(w => w.Id === warehouseId)
      if (warehouse && warehouse.Latitud != null && warehouse.Longitud != null) {
        setPopup({
          warehouse,
          longitude: Number(warehouse.Longitud),
          latitude: Number(warehouse.Latitud)
        })
      }
    }
  }, [filteredWarehouses])

  const fitBounds = useCallback(() => {
    if (!mapRef.current || filteredWarehouses.length === 0) return
    const validCoords = filteredWarehouses
      .filter(w => w.Latitud != null && w.Longitud != null)
      .map(w => [Number(w.Longitud), Number(w.Latitud)] as [number, number])
    if (validCoords.length === 0) return
    if (validCoords.length === 1) {
      mapRef.current.flyTo({ center: validCoords[0], zoom: 10 })
      return
    }
    const lngs = validCoords.map(c => c[0])
    const lats = validCoords.map(c => c[1])
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)]
    ]
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14 })
  }, [filteredWarehouses])

  const handleFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: MapFilterType | null) => {
    if (newFilter !== null) {
      onFilterChange(newFilter)
    }
  }

  const toolbarSx: SxProps = {
    position: 'absolute',
    zIndex: 1,
    top: 10,
    left: 10,
    '& .MuiToggleButtonGroup-root': { gap: 0.5 }
  }

  return (
    <Box sx={{ position: 'absolute', inset: 0 }}>
      <GlobalStyles styles={`
        .warehouse-popup .mapboxgl-popup-content {
          border-radius: 12px;
          padding: 10px 0px;
          overflow: hidden;
        }
        .warehouse-popup .mapboxgl-popup-tip {
          border-top-color: #fff;
        }
        .warehouse-popup .mapboxgl-popup-close-button {
          font-size: 16px;
          padding: 4px 8px;
          color: #9e9e9e;
        }
        .warehouse-popup .mapboxgl-popup-close-button:hover {
          background-color: #f5f5f5;
          color: #616161;
        }
        .mapboxgl-canvas {
          width: 100% !important;
          left: 0 !important;
        }
      `} />
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: MEXICO_CENTER[0],
          latitude: MEXICO_CENTER[1],
          zoom: INITIAL_ZOOM
        }}
        mapStyle='mapbox://styles/mapbox/light-v9'
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        onLoad={fitBounds}
        onClick={onClick}
        onMouseMove={e => {
          if (mapRef.current) {
            const features = mapRef.current.queryRenderedFeatures(e.point, {
              layers: ['warehouse-clusters', 'warehouse-unclustered-point']
            })
            setIsHovering(features.length > 0)
          }
        }}
        onMouseLeave={() => setIsHovering(false)}
        interactiveLayerIds={['warehouse-clusters', 'warehouse-unclustered-point']}
        cursor={isHovering ? 'pointer' : 'grab'}
      >
        <Source
          id='warehouses-source'
          type='geojson'
          data={geojsonData}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer
            id='warehouse-clusters'
            type='circle'
            filter={['has', 'point_count']}
            paint={{
              'circle-color': ['step', ['get', 'point_count'], '#28a745', 5, '#ffc107', 10, '#e55300', 20, '#dc3545'],
              'circle-radius': ['step', ['get', 'point_count'], 20, 5, 28, 10, 36, 20, 44],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff'
            }}
          />
          <Layer
            id='warehouse-cluster-count'
            type='symbol'
            filter={['has', 'point_count']}
            layout={{
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12
            }}
            paint={{ 'text-color': '#ffffff' }}
          />
          <Layer
            id='warehouse-unclustered-point'
            type='circle'
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': ['case', ['get', 'esEricsson'], '#dc3545', '#007bff'],
              'circle-radius': 8,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff'
            }}
          />
        </Source>

        {popup && (
          <Popup
            longitude={popup.longitude}
            latitude={popup.latitude}
            anchor='bottom'
            offset={18}
            closeButton={true}
            closeOnClick={false}
            onClose={() => setPopup(null)}
            className='warehouse-popup'
          >
            <Box sx={{ p: 2, minWidth: 200 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                {popup.warehouse.Almacen}
              </Typography>
              <Typography variant='caption' display='block' color='text.secondary'>
                {popup.warehouse.Direccion ?? 'No disponible'}
              </Typography>
              <Typography variant='caption' display='block' color='text.secondary'>
                ID: {popup.warehouse.Id}
              </Typography>
            </Box>
          </Popup>
        )}
      </Map>

      <Paper sx={toolbarSx} elevation={2}>
        <ToggleButtonGroup
          value={filterType}
          exclusive
          onChange={handleFilterChange}
          size='small'
        >
          <ToggleButton value='all' sx={{ px: 2 }}>
            {t('navigation.warehouses.warehouseMap.all')}
            <Box component='span' sx={{ ml: 1, fontWeight: 700 }}>{totalCount}</Box>
          </ToggleButton>
          <ToggleButton value='gaso' sx={{ px: 2, color: '#007bff' }}>
            {t('navigation.warehouses.warehouseMap.gaso')}
            <Box component='span' sx={{ ml: 1, fontWeight: 700 }}>{gasoCount}</Box>
          </ToggleButton>
          <ToggleButton value='ericsson' sx={{ px: 2, color: '#dc3545' }}>
            {t('navigation.warehouses.warehouseMap.ericsson')}
            <Box component='span' sx={{ ml: 1, fontWeight: 700 }}>{ericssonCount}</Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>
    </Box>
  )
}

export default WarehouseMapView
