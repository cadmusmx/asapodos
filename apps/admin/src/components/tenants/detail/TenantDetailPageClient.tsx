'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import type { TenantRow } from '@/services/tenant-service'
import type { TenantSubscription } from '@gaso/shared/types/plan'
import type { TenantUsage } from '@gaso/shared/types/plan'
import type { BillingRecord } from '@gaso/shared/types/plan'
import TenantOverviewTab from './TenantOverviewTab'
import TenantSubscriptionTab from './TenantSubscriptionTab'
import TenantUsageTab from './TenantUsageTab'
import TenantBillingTab from './TenantBillingTab'
import TenantAuditTab from './TenantAuditTab'
import TenantStatusBadge from '@/components/tenants/TenantStatusBadge'

interface TenantDetailPageClientProps {
  tenant: TenantRow
  subscription: TenantSubscription | null
  usage: (TenantUsage & { limit: number | null })[]
  billingRecords: BillingRecord[]
}

export default function TenantDetailPageClient({
  tenant,
  subscription,
  usage,
  billingRecords
}: TenantDetailPageClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState(0)

  const isSuspended = tenant.Status === 'SUSPENDED'
  const isInactive = tenant.Status === 'INACTIVE'

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => router.push('/admin/tenants')} size='small'>
          <i className='ri-arrow-left-line' />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant='h4' fontWeight='bold'>
              {tenant.CompanyName}
            </Typography>
            <TenantStatusBadge status={tenant.Status} />
          </Box>
          {tenant.Dominio && (
            <Typography variant='body2' color='text.secondary'>
              {tenant.Dominio}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label='General' />
          <Tab label='Suscripción' />
          <Tab label='Uso' />
          <Tab label='Facturación' />
          <Tab label='Auditoría' />
        </Tabs>
      </Box>

      <Box>
        {tab === 0 && (
          <TenantOverviewTab tenant={tenant} subscription={subscription} />
        )}
        {tab === 1 && (
          <TenantSubscriptionTab
            tenant={tenant}
            subscription={subscription}
          />
        )}
        {tab === 2 && (
          <TenantUsageTab usage={usage} />
        )}
        {tab === 3 && (
          <TenantBillingTab
            tenantId={tenant.TenantID}
            billingRecords={billingRecords}
          />
        )}
        {tab === 4 && (
          <TenantAuditTab tenantId={tenant.TenantID} />
        )}
      </Box>
    </Box>
  )
}
