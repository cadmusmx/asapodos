'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import type { HumanCapitalEmployee, HumanCapitalEmployeesResponse } from '@/types/human-capital'
import type {
  HumanCapitalVacationBalance,
  HumanCapitalVacationRequest,
  VacationBalanceGenerationResult,
  VacationBalancePayload,
  VacationBalancesResponse,
  VacationRequestPayload,
  VacationRequestsResponse,
  VacationRequestStatus
} from '@/types/human-capital-vacation'

type FeedbackState = {
  type: 'success' | 'error' | 'info'
  message: string
} | null

type BalanceFormState = {
  employeeId: string
  periodStart: string
  periodEnd: string
  assignedDays: string
  usedDays: string
  notes: string
  isActive: boolean
}

type RequestFormState = {
  employeeId: string
  startDate: string
  endDate: string
  requestedDays: string
  reason: string
}

type GenerateBalanceFormState = {
  employeeId: string
  usedDays: string
  notes: string
}

type VacationReviewAction = 'approve' | 'reject' | 'cancel'

const emptyBalanceForm: BalanceFormState = {
  employeeId: '',
  periodStart: '',
  periodEnd: '',
  assignedDays: '',
  usedDays: '0',
  notes: '',
  isActive: true
}

const emptyRequestForm: RequestFormState = {
  employeeId: '',
  startDate: '',
  endDate: '',
  requestedDays: '',
  reason: ''
}

const emptyGenerateBalanceForm: GenerateBalanceFormState = {
  employeeId: '',
  usedDays: '0',
  notes: ''
}

const statusLabels: Record<VacationRequestStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada'
}

const statusColors: Record<VacationRequestStatus, 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default'
}

const formatDays = (value: number) => Number(value || 0).toFixed(2)

const getEmployeeInitials = (employeeName: string | null): string => {
  if (!employeeName) return 'EM'

  const parts = employeeName.trim().split(/\s+/).slice(0, 2)

  return parts.map(part => part.charAt(0).toUpperCase()).join('')
}

const toBalancePayload = (form: BalanceFormState): VacationBalancePayload => ({
  employeeId: Number(form.employeeId),
  periodStart: form.periodStart,
  periodEnd: form.periodEnd,
  assignedDays: Number(form.assignedDays),
  usedDays: form.usedDays ? Number(form.usedDays) : 0,
  notes: form.notes.trim() || null,
  isActive: form.isActive
})

const toRequestPayload = (form: RequestFormState): VacationRequestPayload => ({
  employeeId: Number(form.employeeId),
  startDate: form.startDate,
  endDate: form.endDate,
  requestedDays: Number(form.requestedDays),
  reason: form.reason.trim() || null
})

const balanceToForm = (balance: HumanCapitalVacationBalance): BalanceFormState => ({
  employeeId: String(balance.employeeId),
  periodStart: balance.periodStart,
  periodEnd: balance.periodEnd,
  assignedDays: String(balance.assignedDays),
  usedDays: String(balance.usedDays),
  notes: balance.notes ?? '',
  isActive: balance.isActive
})

const TimeOffView = () => {
  const [employees, setEmployees] = useState<HumanCapitalEmployee[]>([])
  const [balances, setBalances] = useState<HumanCapitalVacationBalance[]>([])
  const [requests, setRequests] = useState<HumanCapitalVacationRequest[]>([])

  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [requestStatusFilter, setRequestStatusFilter] = useState<VacationRequestStatus | 'all'>('all')
  const [balanceActiveFilter, setBalanceActiveFilter] = useState<'true' | 'false' | 'all'>('true')

  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false)
  const [selectedBalance, setSelectedBalance] = useState<HumanCapitalVacationBalance | null>(null)
  const [balanceForm, setBalanceForm] = useState<BalanceFormState>(emptyBalanceForm)

  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestForm, setRequestForm] = useState<RequestFormState>(emptyRequestForm)

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [generateForm, setGenerateForm] = useState<GenerateBalanceFormState>(emptyGenerateBalanceForm)

  const pendingRequestsCount = useMemo(
    () => requests.filter(request => request.status === 'pending').length,
    [requests]
  )

  const approvedRequestsCount = useMemo(
    () => requests.filter(request => request.status === 'approved').length,
    [requests]
  )

  const rejectedRequestsCount = useMemo(
    () => requests.filter(request => request.status === 'rejected').length,
    [requests]
  )

  const cancelledRequestsCount = useMemo(
    () => requests.filter(request => request.status === 'cancelled').length,
    [requests]
  )

  const isBalanceFormValid =
    Boolean(balanceForm.employeeId) &&
    Boolean(balanceForm.periodStart) &&
    Boolean(balanceForm.periodEnd) &&
    Number.isFinite(Number(balanceForm.assignedDays)) &&
    Number(balanceForm.assignedDays) >= 0 &&
    Number.isFinite(Number(balanceForm.usedDays || 0)) &&
    Number(balanceForm.usedDays || 0) >= 0

  const isRequestFormValid =
    Boolean(requestForm.employeeId) &&
    Boolean(requestForm.startDate) &&
    Boolean(requestForm.endDate) &&
    Number.isFinite(Number(requestForm.requestedDays)) &&
    Number(requestForm.requestedDays) > 0

  const isGenerateFormValid =
    Boolean(generateForm.employeeId) &&
    Number.isFinite(Number(generateForm.usedDays || 0)) &&
    Number(generateForm.usedDays || 0) >= 0

  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true)

    try {
      const response = await fetch('/api/human-capital/employees?page=1&pageSize=100&active=true')
      const data = (await response.json().catch(() => null)) as HumanCapitalEmployeesResponse | null

      if (!response.ok || !data) {
        throw new Error('No se pudieron cargar los empleados.')
      }

      setEmployees(data.data)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al cargar empleados.'
      })
    } finally {
      setLoadingEmployees(false)
    }
  }, [])

  const loadBalances = useCallback(async () => {
    setLoadingBalances(true)

    try {
      const params = new URLSearchParams()

      params.set('page', '1')
      params.set('pageSize', '50')
      params.set('active', balanceActiveFilter)

      if (employeeFilter !== 'all') {
        params.set('employeeId', employeeFilter)
      }

      const response = await fetch(`/api/human-capital/vacation/balances?${params.toString()}`)
      const data = (await response.json().catch(() => null)) as VacationBalancesResponse | null

      if (!response.ok || !data) {
        throw new Error('No se pudieron cargar los saldos de vacaciones.')
      }

      setBalances(data.data)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al cargar saldos.'
      })
    } finally {
      setLoadingBalances(false)
    }
  }, [balanceActiveFilter, employeeFilter])

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true)

    try {
      const params = new URLSearchParams()

      params.set('page', '1')
      params.set('pageSize', '50')

      if (employeeFilter !== 'all') {
        params.set('employeeId', employeeFilter)
      }

      if (requestStatusFilter !== 'all') {
        params.set('status', requestStatusFilter)
      }

      const response = await fetch(`/api/human-capital/vacation/requests?${params.toString()}`)
      const data = (await response.json().catch(() => null)) as VacationRequestsResponse | null

      if (!response.ok || !data) {
        throw new Error('No se pudieron cargar las solicitudes de vacaciones.')
      }

      setRequests(data.data)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al cargar solicitudes.'
      })
    } finally {
      setLoadingRequests(false)
    }
  }, [employeeFilter, requestStatusFilter])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  useEffect(() => {
    loadBalances()
  }, [loadBalances])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const refreshData = async () => {
    await Promise.all([loadBalances(), loadRequests()])
  }

  const openCreateBalanceDialog = () => {
    setSelectedBalance(null)
    setBalanceForm(emptyBalanceForm)
    setBalanceDialogOpen(true)
    setFeedback(null)
  }

  const openGenerateBalanceDialog = () => {
    setGenerateForm(emptyGenerateBalanceForm)
    setGenerateDialogOpen(true)
    setFeedback(null)
  }

  const openEditBalanceDialog = (balance: HumanCapitalVacationBalance) => {
    setSelectedBalance(balance)
    setBalanceForm(balanceToForm(balance))
    setBalanceDialogOpen(true)
    setFeedback(null)
  }

  const closeBalanceDialog = () => {
    if (saving) return

    setBalanceDialogOpen(false)
    setSelectedBalance(null)
    setBalanceForm(emptyBalanceForm)
  }

  const openRequestDialog = () => {
    setRequestForm(emptyRequestForm)
    setRequestDialogOpen(true)
    setFeedback(null)
  }

  const closeRequestDialog = () => {
    if (saving) return

    setRequestDialogOpen(false)
    setRequestForm(emptyRequestForm)
  }

  const closeGenerateBalanceDialog = () => {
    if (saving) return

    setGenerateDialogOpen(false)
    setGenerateForm(emptyGenerateBalanceForm)
  }

  const updateBalanceForm = <K extends keyof BalanceFormState>(field: K, value: BalanceFormState[K]) => {
    setBalanceForm(current => ({
      ...current,
      [field]: value
    }))
  }

  const updateRequestForm = <K extends keyof RequestFormState>(field: K, value: RequestFormState[K]) => {
    setRequestForm(current => ({
      ...current,
      [field]: value
    }))
  }

  const updateGenerateForm = <K extends keyof GenerateBalanceFormState>(
    field: K,
    value: GenerateBalanceFormState[K]
  ) => {
    setGenerateForm(current => ({
      ...current,
      [field]: value
    }))
  }

  const saveBalance = async () => {
    if (!isBalanceFormValid) {
      setFeedback({
        type: 'error',
        message: 'Captura empleado, periodo y días asignados válidos.'
      })

      return
    }

    setSaving(true)
    setFeedback(null)

    try {
      const isEditing = Boolean(selectedBalance)
      const payload = toBalancePayload(balanceForm)

      const response = await fetch(
        isEditing
          ? `/api/human-capital/vacation/balances/${selectedBalance?.id}`
          : '/api/human-capital/vacation/balances',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      const data = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(data?.message ?? 'No se pudo guardar el saldo.')
      }

      setFeedback({
        type: 'success',
        message: isEditing ? 'Saldo actualizado correctamente.' : 'Saldo creado correctamente.'
      })

      closeBalanceDialog()
      await refreshData()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al guardar saldo.'
      })
    } finally {
      setSaving(false)
    }
  }

  const generateLegalBalance = async () => {
    if (!isGenerateFormValid) {
      setFeedback({
        type: 'error',
        message: 'Selecciona un empleado y captura días usados válidos.'
      })

      return
    }

    setSaving(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/human-capital/vacation/balances/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: Number(generateForm.employeeId),
          usedDays: Number(generateForm.usedDays || 0),
          notes: generateForm.notes.trim() || null,
          referenceDate: null
        })
      })

      const data = (await response.json().catch(() => null)) as {
        message?: string
        data?: VacationBalanceGenerationResult
      } | null

      if (!response.ok) {
        throw new Error(data?.message ?? 'No se pudo generar el saldo legal.')
      }

      setFeedback({
        type: data?.data?.generated ? 'success' : 'info',
        message: data?.message ?? 'Saldo procesado correctamente.'
      })

      closeGenerateBalanceDialog()
      await refreshData()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al generar saldo legal.'
      })
    } finally {
      setSaving(false)
    }
  }

  const saveRequest = async () => {
    if (!isRequestFormValid) {
      setFeedback({
        type: 'error',
        message: 'Captura empleado, fechas y días solicitados válidos.'
      })

      return
    }

    setSaving(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/human-capital/vacation/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(toRequestPayload(requestForm))
      })

      const data = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(data?.message ?? 'No se pudo crear la solicitud.')
      }

      setFeedback({
        type: 'success',
        message: 'Solicitud creada correctamente.'
      })

      closeRequestDialog()
      await refreshData()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al crear solicitud.'
      })
    } finally {
      setSaving(false)
    }
  }

  const deactivateBalance = async (balance: HumanCapitalVacationBalance) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas desactivar el saldo de ${balance.employeeName ?? 'este empleado'}?`
    )

    if (!confirmed) return

    setFeedback(null)

    try {
      const response = await fetch(`/api/human-capital/vacation/balances/${balance.id}`, {
        method: 'DELETE'
      })

      const data = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(data?.message ?? 'No se pudo desactivar el saldo.')
      }

      setFeedback({
        type: 'success',
        message: 'Saldo desactivado correctamente.'
      })

      await refreshData()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al desactivar saldo.'
      })
    }
  }

  const reviewRequest = async (request: HumanCapitalVacationRequest, action: VacationReviewAction) => {
    const actionLabel = action === 'approve' ? 'aprobar' : action === 'reject' ? 'rechazar' : 'cancelar'

    const comments = window.prompt(
      `Comentario para ${actionLabel} la solicitud de ${request.employeeName ?? 'empleado'}:`
    )

    if (comments === null) return

    setFeedback(null)

    try {
      const response = await fetch(`/api/human-capital/vacation/requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          comments
        })
      })

      const data = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(data?.message ?? 'No se pudo actualizar la solicitud.')
      }

      setFeedback({
        type: 'success',
        message: 'Solicitud actualizada correctamente.'
      })

      await refreshData()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al actualizar solicitud.'
      })
    }
  }

  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Stack spacing={4}>
        <Card
          sx={{
            overflow: 'hidden',
            border: theme => `1px solid ${theme.palette.divider}`,
            boxShadow: theme => theme.shadows[8]
          }}
        >
          <CardContent
            sx={{
              p: { xs: 4, md: 6 },
              background: theme =>
                `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent='space-between'
              spacing={4}
            >
              <Stack direction='row' spacing={3} alignItems='center'>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    boxShadow: theme => theme.shadows[4]
                  }}
                >
                  <i className='ri-calendar-check-line' />
                </Avatar>

                <Box>
                  <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
                    <Typography variant='h4'>Vacaciones</Typography>
                    <Chip label='Capital Humano' size='small' variant='outlined' />
                  </Stack>
                </Box>
                <Button
                  variant='contained'
                  color='secondary'
                  startIcon={<i className='ri-magic-line' />}
                  onClick={openGenerateBalanceDialog}
                >
                  Generar saldo
                </Button>

                <Button
                  variant='outlined'
                  startIcon={<i className='ri-wallet-3-line' />}
                  onClick={openCreateBalanceDialog}
                >
                  Saldo manual
                </Button>

                <Button
                  variant='contained'
                  startIcon={<i className='ri-calendar-event-line' />}
                  onClick={openRequestDialog}
                >
                  Nueva solicitud
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={3}>
                  <Box>
                    <Typography variant='h5'>{pendingRequestsCount}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Solicitudes pendientes
                    </Typography>
                  </Box>

                  <Avatar sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                    <i className='ri-time-line' />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={3}>
                  <Box>
                    <Typography variant='h5'>{approvedRequestsCount}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Solicitudes aceptadas
                    </Typography>
                  </Box>

                  <Avatar sx={{ bgcolor: 'success.main', color: 'success.contrastText' }}>
                    <i className='ri-checkbox-circle-line' />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={3}>
                  <Box>
                    <Typography variant='h5'>{rejectedRequestsCount}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Solicitudes rechazadas
                    </Typography>
                  </Box>

                  <Avatar sx={{ bgcolor: 'error.main', color: 'error.contrastText' }}>
                    <i className='ri-close-circle-line' />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={3}>
                  <Box>
                    <Typography variant='h5'>{cancelledRequestsCount}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Solicitudes canceladas
                    </Typography>
                  </Box>

                  <Avatar sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
                    <i className='ri-forbid-line' />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {feedback && <Alert severity={feedback.type}>{feedback.message}</Alert>}

        <Card>
          <CardContent>
            <Stack spacing={4}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent='space-between'
                spacing={2}
              >
                <Box>
                  <Typography variant='h6'>Panel de control</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Filtra saldos y solicitudes por empleado, estado o vigencia.
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant='outlined'
                    startIcon={<i className='ri-refresh-line' />}
                    onClick={refreshData}
                    disabled={loadingBalances || loadingRequests}
                  >
                    Actualizar
                  </Button>
                </Stack>
              </Stack>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel id='vacation-employee-filter-label'>Empleado</InputLabel>
                    <Select
                      labelId='vacation-employee-filter-label'
                      label='Empleado'
                      value={employeeFilter}
                      onChange={event => setEmployeeFilter(event.target.value)}
                      disabled={loadingEmployees}
                    >
                      <MenuItem value='all'>Todos los empleados</MenuItem>
                      {employees.map(employee => (
                        <MenuItem key={employee.id} value={String(employee.id)}>
                          {employee.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel id='vacation-status-filter-label'>Estado solicitud</InputLabel>
                    <Select
                      labelId='vacation-status-filter-label'
                      label='Estado solicitud'
                      value={requestStatusFilter}
                      onChange={event => setRequestStatusFilter(event.target.value as VacationRequestStatus | 'all')}
                    >
                      <MenuItem value='all'>Todas</MenuItem>
                      <MenuItem value='pending'>Pendientes</MenuItem>
                      <MenuItem value='approved'>Aprobadas</MenuItem>
                      <MenuItem value='rejected'>Rechazadas</MenuItem>
                      <MenuItem value='cancelled'>Canceladas</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel id='vacation-balance-active-filter-label'>Saldos</InputLabel>
                    <Select
                      labelId='vacation-balance-active-filter-label'
                      label='Saldos'
                      value={balanceActiveFilter}
                      onChange={event => setBalanceActiveFilter(event.target.value as 'true' | 'false' | 'all')}
                    >
                      <MenuItem value='true'>Activos</MenuItem>
                      <MenuItem value='false'>Inactivos</MenuItem>
                      <MenuItem value='all'>Todos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, xl: 6 }}>
            <Card>
              <CardContent>
                <Stack spacing={4}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent='space-between'
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={2}
                  >
                    <Box>
                      <Typography variant='h6'>Saldos de vacaciones</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Periodos legales y ajustes manuales por empleado.
                      </Typography>
                    </Box>

                    <Stack direction='row' spacing={1}>
                      <Button
                        size='small'
                        variant='contained'
                        color='secondary'
                        startIcon={<i className='ri-magic-line' />}
                        onClick={openGenerateBalanceDialog}
                      >
                        Generar
                      </Button>

                      <Button
                        size='small'
                        variant='outlined'
                        startIcon={<i className='ri-add-line' />}
                        onClick={openCreateBalanceDialog}
                      >
                        Manual
                      </Button>
                    </Stack>
                  </Stack>

                  <Divider />

                  <TableContainer component={Paper} variant='outlined'>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Empleado</TableCell>
                          <TableCell>Periodo</TableCell>
                          <TableCell align='right'>Disponible</TableCell>
                          <TableCell align='right'>Acciones</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {loadingBalances ? (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <Stack alignItems='center' spacing={2} sx={{ py: 5 }}>
                                <CircularProgress />
                                <Typography variant='body2' color='text.secondary'>
                                  Cargando saldos...
                                </Typography>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ) : balances.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <Stack alignItems='center' spacing={2} sx={{ py: 5 }}>
                                <Avatar>
                                  <i className='ri-wallet-3-line' />
                                </Avatar>
                                <Typography variant='body2' color='text.secondary'>
                                  No hay saldos para mostrar.
                                </Typography>
                                <Button
                                  size='small'
                                  variant='contained'
                                  color='secondary'
                                  startIcon={<i className='ri-magic-line' />}
                                  onClick={openGenerateBalanceDialog}
                                >
                                  Generar saldo legal
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ) : (
                          balances.map(balance => (
                            <TableRow key={balance.id} hover>
                              <TableCell>
                                <Stack direction='row' spacing={2} alignItems='center'>
                                  <Avatar sx={{ width: 34, height: 34, fontSize: 13 }}>
                                    {getEmployeeInitials(balance.employeeName)}
                                  </Avatar>

                                  <Stack spacing={0.5}>
                                    <Typography variant='body2' fontWeight={600}>
                                      {balance.employeeName ?? 'Empleado'}
                                    </Typography>
                                    <Chip
                                      label={balance.isActive ? 'Activo' : 'Inactivo'}
                                      size='small'
                                      color={balance.isActive ? 'success' : 'default'}
                                      variant='outlined'
                                      sx={{ width: 'fit-content' }}
                                    />
                                  </Stack>
                                </Stack>
                              </TableCell>

                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant='body2'>
                                    {balance.periodStart} / {balance.periodEnd}
                                  </Typography>
                                  <Typography variant='caption' color='text.secondary'>
                                    Asignados {formatDays(balance.assignedDays)} · Usados {formatDays(balance.usedDays)}{' '}
                                    · Pendientes {formatDays(balance.pendingDays)}
                                  </Typography>
                                </Stack>
                              </TableCell>

                              <TableCell align='right'>
                                <Typography variant='body2' fontWeight={700}>
                                  {formatDays(balance.availableDays)}
                                </Typography>
                              </TableCell>

                              <TableCell align='right'>
                                <Tooltip title='Editar saldo'>
                                  <IconButton size='small' onClick={() => openEditBalanceDialog(balance)}>
                                    <i className='ri-pencil-line' />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title={balance.isActive ? 'Desactivar saldo' : 'Saldo inactivo'}>
                                  <span>
                                    <IconButton
                                      size='small'
                                      color='error'
                                      disabled={!balance.isActive}
                                      onClick={() => deactivateBalance(balance)}
                                    >
                                      <i className='ri-close-circle-line' />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, xl: 6 }}>
            <Card>
              <CardContent>
                <Stack spacing={4}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent='space-between'
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={2}
                  >
                    <Box>
                      <Typography variant='h6'>Solicitudes</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Solicitudes registradas y flujo de autorización.
                      </Typography>
                    </Box>

                    <Button
                      size='small'
                      variant='contained'
                      startIcon={<i className='ri-calendar-event-line' />}
                      onClick={openRequestDialog}
                    >
                      Nueva
                    </Button>
                  </Stack>

                  <Divider />

                  <TableContainer component={Paper} variant='outlined'>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Empleado</TableCell>
                          <TableCell>Fechas</TableCell>
                          <TableCell>Estado</TableCell>
                          <TableCell align='right'>Acciones</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {loadingRequests ? (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <Stack alignItems='center' spacing={2} sx={{ py: 5 }}>
                                <CircularProgress />
                                <Typography variant='body2' color='text.secondary'>
                                  Cargando solicitudes...
                                </Typography>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ) : requests.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <Stack alignItems='center' spacing={2} sx={{ py: 5 }}>
                                <Avatar>
                                  <i className='ri-calendar-event-line' />
                                </Avatar>
                                <Typography variant='body2' color='text.secondary'>
                                  No hay solicitudes para mostrar.
                                </Typography>
                                <Button
                                  size='small'
                                  variant='contained'
                                  startIcon={<i className='ri-add-line' />}
                                  onClick={openRequestDialog}
                                >
                                  Crear solicitud
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ) : (
                          requests.map(request => (
                            <TableRow key={request.id} hover>
                              <TableCell>
                                <Stack direction='row' spacing={2} alignItems='center'>
                                  <Avatar sx={{ width: 34, height: 34, fontSize: 13 }}>
                                    {getEmployeeInitials(request.employeeName)}
                                  </Avatar>

                                  <Stack spacing={0.5}>
                                    <Typography variant='body2' fontWeight={600}>
                                      {request.employeeName ?? 'Empleado'}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                      {request.reason ?? 'Sin motivo'}
                                    </Typography>
                                  </Stack>
                                </Stack>
                              </TableCell>

                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant='body2'>
                                    {request.startDate} / {request.endDate}
                                  </Typography>
                                  <Typography variant='caption' color='text.secondary'>
                                    {formatDays(request.requestedDays)} días
                                  </Typography>
                                </Stack>
                              </TableCell>

                              <TableCell>
                                <Chip
                                  label={statusLabels[request.status]}
                                  color={statusColors[request.status]}
                                  size='small'
                                  variant='outlined'
                                />
                              </TableCell>

                              <TableCell align='right'>
                                <Stack direction='row' justifyContent='flex-end' spacing={1}>
                                  <Tooltip title='Aprobar'>
                                    <span>
                                      <IconButton
                                        size='small'
                                        color='success'
                                        disabled={request.status !== 'pending'}
                                        onClick={() => reviewRequest(request, 'approve')}
                                      >
                                        <i className='ri-check-line' />
                                      </IconButton>
                                    </span>
                                  </Tooltip>

                                  <Tooltip title='Rechazar'>
                                    <span>
                                      <IconButton
                                        size='small'
                                        color='error'
                                        disabled={request.status !== 'pending'}
                                        onClick={() => reviewRequest(request, 'reject')}
                                      >
                                        <i className='ri-close-line' />
                                      </IconButton>
                                    </span>
                                  </Tooltip>

                                  <Tooltip title='Cancelar'>
                                    <span>
                                      <IconButton
                                        size='small'
                                        disabled={request.status !== 'pending'}
                                        onClick={() => reviewRequest(request, 'cancel')}
                                      >
                                        <i className='ri-forbid-line' />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>

      <Dialog open={generateDialogOpen} onClose={closeGenerateBalanceDialog} maxWidth='md' fullWidth>
        <DialogTitle>
          <Stack spacing={0.5}>
            <Typography variant='h5'>Generar saldo legal</Typography>
            <Typography variant='body2' color='text.secondary'>
              Calcula automáticamente el periodo y los días de vacaciones usando la fecha de ingreso del empleado.
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={4} sx={{ pt: 2 }}>
            <Alert severity='info' variant='outlined'>
              El sistema calculará el saldo con la fecha de ingreso registrada del empleado y la fecha actual. Solo
              captura días usados si el empleado ya tomó vacaciones antes de migrar al sistema.
            </Alert>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id='generate-balance-employee-label'>Empleado</InputLabel>
                  <Select
                    labelId='generate-balance-employee-label'
                    label='Empleado'
                    value={generateForm.employeeId}
                    onChange={event => updateGenerateForm('employeeId', event.target.value)}
                    disabled={saving || loadingEmployees}
                  >
                    {employees.map(employee => (
                      <MenuItem key={employee.id} value={String(employee.id)}>
                        {employee.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label='Días usados'
                  type='number'
                  value={generateForm.usedDays}
                  onChange={event => updateGenerateForm('usedDays', event.target.value)}
                  fullWidth
                  disabled={saving}
                  inputProps={{ min: 0, step: 0.5 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <i className='ri-checkbox-circle-line' />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label='Notas'
                  value={generateForm.notes}
                  onChange={event => updateGenerateForm('notes', event.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  disabled={saving}
                  placeholder='Ejemplo: Saldo inicial generado por migración de RH.'
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 6, pb: 4 }}>
          <Button onClick={closeGenerateBalanceDialog} disabled={saving}>
            Cancelar
          </Button>

          <Button
            variant='contained'
            color='secondary'
            onClick={generateLegalBalance}
            disabled={saving || !isGenerateFormValid}
            startIcon={saving ? <CircularProgress size={18} color='inherit' /> : <i className='ri-magic-line' />}
          >
            {saving ? 'Generando...' : 'Generar saldo'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={balanceDialogOpen} onClose={closeBalanceDialog} maxWidth='md' fullWidth>
        <DialogTitle>
          <Stack spacing={0.5}>
            <Typography variant='h5'>{selectedBalance ? 'Editar saldo manual' : 'Nuevo saldo manual'}</Typography>
            <Typography variant='body2' color='text.secondary'>
              Usa esta opción para ajustes administrativos, saldos iniciales o correcciones auditables.
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={4} sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id='balance-employee-label'>Empleado</InputLabel>
                  <Select
                    labelId='balance-employee-label'
                    label='Empleado'
                    value={balanceForm.employeeId}
                    onChange={event => updateBalanceForm('employeeId', event.target.value)}
                    disabled={saving || loadingEmployees}
                  >
                    {employees.map(employee => (
                      <MenuItem key={employee.id} value={String(employee.id)}>
                        {employee.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label='Inicio periodo'
                  type='date'
                  value={balanceForm.periodStart}
                  onChange={event => updateBalanceForm('periodStart', event.target.value)}
                  fullWidth
                  disabled={saving}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label='Fin periodo'
                  type='date'
                  value={balanceForm.periodEnd}
                  onChange={event => updateBalanceForm('periodEnd', event.target.value)}
                  fullWidth
                  disabled={saving}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label='Días asignados'
                  type='number'
                  value={balanceForm.assignedDays}
                  onChange={event => updateBalanceForm('assignedDays', event.target.value)}
                  fullWidth
                  disabled={saving}
                  inputProps={{ min: 0, step: 0.5 }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label='Días usados'
                  type='number'
                  value={balanceForm.usedDays}
                  onChange={event => updateBalanceForm('usedDays', event.target.value)}
                  fullWidth
                  disabled={saving}
                  inputProps={{ min: 0, step: 0.5 }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id='balance-active-label'>Estatus</InputLabel>
                  <Select
                    labelId='balance-active-label'
                    label='Estatus'
                    value={balanceForm.isActive ? 'true' : 'false'}
                    onChange={event => updateBalanceForm('isActive', event.target.value === 'true')}
                    disabled={saving}
                  >
                    <MenuItem value='true'>Activo</MenuItem>
                    <MenuItem value='false'>Inactivo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label='Notas'
                  value={balanceForm.notes}
                  onChange={event => updateBalanceForm('notes', event.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  disabled={saving}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 6, pb: 4 }}>
          <Button onClick={closeBalanceDialog} disabled={saving}>
            Cancelar
          </Button>

          <Button
            variant='contained'
            onClick={saveBalance}
            disabled={saving || !isBalanceFormValid}
            startIcon={saving ? <CircularProgress size={18} color='inherit' /> : <i className='ri-save-line' />}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={requestDialogOpen} onClose={closeRequestDialog} maxWidth='md' fullWidth>
        <DialogTitle>
          <Stack spacing={0.5}>
            <Typography variant='h5'>Nueva solicitud de vacaciones</Typography>
            <Typography variant='body2' color='text.secondary'>
              Registra una solicitud pendiente para revisión.
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={4} sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id='request-employee-label'>Empleado</InputLabel>
                  <Select
                    labelId='request-employee-label'
                    label='Empleado'
                    value={requestForm.employeeId}
                    onChange={event => updateRequestForm('employeeId', event.target.value)}
                    disabled={saving || loadingEmployees}
                  >
                    {employees.map(employee => (
                      <MenuItem key={employee.id} value={String(employee.id)}>
                        {employee.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label='Fecha inicio'
                  type='date'
                  value={requestForm.startDate}
                  onChange={event => updateRequestForm('startDate', event.target.value)}
                  fullWidth
                  disabled={saving}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label='Fecha fin'
                  type='date'
                  value={requestForm.endDate}
                  onChange={event => updateRequestForm('endDate', event.target.value)}
                  fullWidth
                  disabled={saving}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='Días solicitados'
                  type='number'
                  value={requestForm.requestedDays}
                  onChange={event => updateRequestForm('requestedDays', event.target.value)}
                  fullWidth
                  disabled={saving}
                  inputProps={{ min: 0.5, step: 0.5 }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  label='Motivo'
                  value={requestForm.reason}
                  onChange={event => updateRequestForm('reason', event.target.value)}
                  fullWidth
                  disabled={saving}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <i className='ri-message-3-line' />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 6, pb: 4 }}>
          <Button onClick={closeRequestDialog} disabled={saving}>
            Cancelar
          </Button>

          <Button
            variant='contained'
            onClick={saveRequest}
            disabled={saving || !isRequestFormValid}
            startIcon={saving ? <CircularProgress size={18} color='inherit' /> : <i className='ri-send-plane-line' />}
          >
            {saving ? 'Guardando...' : 'Crear solicitud'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TimeOffView
