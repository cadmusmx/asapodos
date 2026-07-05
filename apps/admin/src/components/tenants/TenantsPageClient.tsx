'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import type { TenantStatus, TenantRow } from '@/services/tenant-service'
import TenantTable from '@/components/tenants/TenantTable'
import TenantFilters from '@/components/tenants/TenantFilters'
import TenantCreateModal from '@/components/tenants/TenantCreateModal'
import TenantEditModal from '@/components/tenants/TenantEditModal'
import TenantDetailModal from '@/components/tenants/TenantDetailModal'
import TenantSuspendModal from '@/components/tenants/TenantSuspendModal'
import TenantActivateModal from '@/components/tenants/TenantActivateModal'
import TenantDeactivateModal from '@/components/tenants/TenantDeactivateModal'

interface TenantsPageClientProps {
  tenants: TenantRow[]
  total: number
  page: number
  pageSize: number
  status: TenantStatus | null
  search: string | null
  adminTenantDomain?: string
}

export default function TenantsPageClient({
  tenants,
  total,
  page,
  pageSize,
  status,
  search,
  adminTenantDomain
}: TenantsPageClientProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [suspendModalOpen, setSuspendModalOpen] = useState(false)
  const [activateModalOpen, setActivateModalOpen] = useState(false)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)

  const [selectedTenant, setSelectedTenant] = useState<TenantRow | null>(null)

  const handleView = (tenant: TenantRow) => {
    setSelectedTenant(tenant)
    setDetailModalOpen(true)
  }

  const handleEdit = (tenant: TenantRow) => {
    setSelectedTenant(tenant)
    setEditModalOpen(true)
  }

  const handleSuspend = (tenant: TenantRow) => {
    setSelectedTenant(tenant)
    setSuspendModalOpen(true)
  }

  const handleActivate = (tenant: TenantRow) => {
    setSelectedTenant(tenant)
    setActivateModalOpen(true)
  }

  const handleDeactivate = (tenant: TenantRow) => {
    setSelectedTenant(tenant)
    setDeactivateModalOpen(true)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant='h4' fontWeight='bold'>
          Gestión de Tenants
        </Typography>
        <Button variant='contained' onClick={() => setCreateModalOpen(true)}>
          + Nuevo Tenant
        </Button>
      </Box>

      <TenantFilters />

      <TenantTable
        tenants={tenants}
        total={total}
        page={page}
        pageSize={pageSize}
        status={status}
        search={search}
        adminTenantDomain={adminTenantDomain}
        onView={handleView}
        onEdit={handleEdit}
        onSuspend={handleSuspend}
        onActivate={handleActivate}
        onDeactivate={handleDeactivate}
        onCreate={() => setCreateModalOpen(true)}
      />

      <TenantCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <TenantEditModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedTenant(null) }}
        tenant={selectedTenant}
      />

      <TenantDetailModal
        open={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setSelectedTenant(null) }}
        tenant={selectedTenant}
        adminTenantDomain={adminTenantDomain}
        onEdit={handleEdit}
        onSuspend={handleSuspend}
        onActivate={handleActivate}
        onDeactivate={handleDeactivate}
      />

      <TenantSuspendModal
        open={suspendModalOpen}
        onClose={() => { setSuspendModalOpen(false); setSelectedTenant(null) }}
        tenant={selectedTenant}
      />

      <TenantActivateModal
        open={activateModalOpen}
        onClose={() => { setActivateModalOpen(false); setSelectedTenant(null) }}
        tenant={selectedTenant}
      />

      <TenantDeactivateModal
        open={deactivateModalOpen}
        onClose={() => { setDeactivateModalOpen(false); setSelectedTenant(null) }}
        tenant={selectedTenant}
      />
    </Box>
  )
}
