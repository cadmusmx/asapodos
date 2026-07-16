'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import type { PlanDefinition } from '@gaso/shared/types/plan'
import { toast } from 'react-toastify'
import type { PlanFeaturesById, PlanFeature } from '@gaso/shared/types/plan'
import PlanTable from './PlanTable'
import PlanCreateModal from './PlanCreateModal'
import PlanEditModal from './PlanEditModal'
import PlanFilters from './PlanFilters'

export type PlanWithFeatures = PlanDefinition & {
  features: PlanFeature[]
  featuresById: PlanFeaturesById
}

interface PlansPageClientProps {
  plans: PlanWithFeatures[]
  search?: string
  status?: string
}

export default function PlansPageClient({ plans }: PlansPageClientProps) {
  const router = useRouter()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanWithFeatures | null>(null)

  const handleEdit = (plan: PlanWithFeatures) => {
    setSelectedPlan(plan)
    setEditModalOpen(true)
  }

  const handleDeactivate = async (plan: PlanWithFeatures) => {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Error al desactivar el plan')
      }
      toast.success('Plan desactivado exitosamente')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al desactivar el plan')
    }
  }

  const handleActivate = async (plan: PlanWithFeatures) => {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}/activate`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Error al activar el plan')
      }
      toast.success('Plan activado exitosamente')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al activar el plan')
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant='h4' fontWeight='bold'>
          Planes
        </Typography>
        <Button variant='contained' onClick={() => setCreateModalOpen(true)}>
          + Nuevo Plan
        </Button>
      </Box>

      <PlanFilters />

      <PlanTable plans={plans} onEdit={handleEdit} onDeactivate={handleDeactivate} onActivate={handleActivate} />

      <PlanCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <PlanEditModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedPlan(null) }}
        plan={selectedPlan}
      />
    </Box>
  )
}
