'use client'

import { useState, useEffect } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import FormHelperText from '@mui/material/FormHelperText'
import type { PlanFeatureMap, PlanFeatureKey } from '@gaso/shared/types/plan'

const MODULE_OPTIONS: { key: PlanFeatureKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'warehouses', label: 'Almacenes' },
  { key: 'human_capital', label: 'Capital Humano' },
  { key: 'projects', label: 'Proyectos' },
  { key: 'administration', label: 'Administración' },
  { key: 'operating_expenses', label: 'Gastos Operativos' },
  { key: 'quotes', label: 'Cotizaciones' },
  { key: 'suppliers', label: 'Proveedores' },
  { key: 'vehicles', label: 'Vehículos' }
]

interface PlanFeaturesEditorProps {
  features: PlanFeatureMap
  onChange: (features: PlanFeatureMap) => void
  error?: string
}

export default function PlanFeaturesEditor({ features, onChange, error }: PlanFeaturesEditorProps) {
  const [localFeatures, setLocalFeatures] = useState<PlanFeatureMap>(features)

  useEffect(() => {
    setLocalFeatures(features)
  }, [features])

  const handleToggle = (key: PlanFeatureKey) => {
    const updated = { ...localFeatures, [key]: !localFeatures[key] }
    setLocalFeatures(updated)
    onChange(updated)
  }

  return (
    <Box>
      <Typography variant='subtitle2' gutterBottom sx={{ mb: 2 }}>
        Módulos incluidos
      </Typography>
      <Grid container spacing={2}>
        {MODULE_OPTIONS.map(({ key, label }) => (
          <Grid item xs={12} sm={6} md={4} key={key}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={localFeatures[key] ?? false}
                  onChange={() => handleToggle(key)}
                  color='primary'
                />
              }
              label={label}
            />
          </Grid>
        ))}
      </Grid>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  )
}
