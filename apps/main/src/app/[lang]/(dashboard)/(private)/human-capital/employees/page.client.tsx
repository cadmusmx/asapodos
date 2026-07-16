'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
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
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import EmployeeMfaResetCard from './EmployeeMfaResetCard'

import type {
  EmploymentStatus,
  HumanCapitalCatalogsResponse,
  HumanCapitalEmployee,
  HumanCapitalEmployeePayload,
  HumanCapitalEmployeesResponse
} from '@/types/human-capital'

type FeedbackState = {
  type: 'success' | 'error' | 'info'
  message: string
} | null

type EmployeeFormState = {
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string
  departmentId: string
  positionId: string
  employmentStatus: EmploymentStatus
  hireDate: string
  terminationDate: string
}

const emptyForm: EmployeeFormState = {
  employeeNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  departmentId: '',
  positionId: '',
  employmentStatus: 'active',
  hireDate: '',
  terminationDate: ''
}

const statusLabels: Record<EmploymentStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  on_leave: 'Permiso',
  terminated: 'Terminado'
}

const statusColors: Record<EmploymentStatus, 'success' | 'default' | 'warning' | 'error'> = {
  active: 'success',
  inactive: 'default',
  on_leave: 'warning',
  terminated: 'error'
}

const toPayload = (form: EmployeeFormState): HumanCapitalEmployeePayload => ({
  employeeNumber: form.employeeNumber.trim() || null,
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  email: form.email.trim() || null,
  phone: form.phone.trim() || null,
  departmentId: form.departmentId ? Number(form.departmentId) : null,
  positionId: form.positionId ? Number(form.positionId) : null,
  employmentStatus: form.employmentStatus,
  hireDate: form.hireDate || null,
  terminationDate: form.terminationDate || null
})

const employeeToForm = (employee: HumanCapitalEmployee): EmployeeFormState => ({
  employeeNumber: employee.employeeNumber ?? '',
  firstName: employee.firstName,
  lastName: employee.lastName,
  email: employee.email ?? '',
  phone: employee.phone ?? '',
  departmentId: employee.departmentId ? String(employee.departmentId) : '',
  positionId: employee.positionId ? String(employee.positionId) : '',
  employmentStatus: employee.employmentStatus,
  hireDate: employee.hireDate ?? '',
  terminationDate: employee.terminationDate ?? ''
})

const HumanCapitalEmployeesView = () => {
  const [employees, setEmployees] = useState<HumanCapitalEmployee[]>([])

  const [catalogs, setCatalogs] = useState<HumanCapitalCatalogsResponse>({
    departments: [],
    positions: []
  })

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EmploymentStatus | 'all'>('all')
  const [active, setActive] = useState<'true' | 'false' | 'all'>('true')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<HumanCapitalEmployee | null>(null)
  const [form, setForm] = useState<EmployeeFormState>(emptyForm)

  const filteredPositions = useMemo(() => {
    if (!form.departmentId) return catalogs.positions

    const departmentId = Number(form.departmentId)

    return catalogs.positions.filter(position => !position.departmentId || position.departmentId === departmentId)
  }, [catalogs.positions, form.departmentId])

  const loadCatalogs = useCallback(async () => {
    const response = await fetch('/api/human-capital/catalogs')
    const data = (await response.json().catch(() => null)) as HumanCapitalCatalogsResponse | null

    if (!response.ok || !data) {
      throw new Error('No se pudieron cargar los catálogos.')
    }

    setCatalogs(data)
  }, [])

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    setFeedback(null)

    try {
      const params = new URLSearchParams()

      params.set('page', String(page + 1))
      params.set('pageSize', String(pageSize))

      if (search.trim()) params.set('search', search.trim())
      if (status !== 'all') params.set('status', status)
      if (active !== 'all') params.set('active', active)

      const response = await fetch(`/api/human-capital/employees?${params.toString()}`)

      const data = (await response.json().catch(() => null)) as
        | (HumanCapitalEmployeesResponse & { page?: number; pageSize?: number })
        | null

      if (!response.ok || !data) {
        throw new Error(data && 'message' in data ? String(data.message) : 'No se pudieron cargar los empleados.')
      }

      setEmployees(data.data)
      setTotal(data.total)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al cargar empleados.'
      })
    } finally {
      setLoading(false)
    }
  }, [active, page, pageSize, search, status])

  useEffect(() => {
    loadCatalogs().catch(error => {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al cargar catálogos.'
      })
    })
  }, [loadCatalogs])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const openCreateDialog = () => {
    setSelectedEmployee(null)
    setForm(emptyForm)
    setDialogOpen(true)
    setFeedback(null)
  }

  const openEditDialog = (employee: HumanCapitalEmployee) => {
    setSelectedEmployee(employee)
    setForm(employeeToForm(employee))
    setDialogOpen(true)
    setFeedback(null)
  }

  const closeDialog = () => {
    if (saving) return

    setDialogOpen(false)
    setSelectedEmployee(null)
    setForm(emptyForm)
  }

  const updateForm = <K extends keyof EmployeeFormState>(field: K, value: EmployeeFormState[K]) => {
    setForm(current => ({
      ...current,
      [field]: value,
      ...(field === 'departmentId' ? { positionId: '' } : {})
    }))
  }

  const saveEmployee = async () => {
    setSaving(true)
    setFeedback(null)

    try {
      const payload = toPayload(form)
      const isEditing = Boolean(selectedEmployee)

      const response = await fetch(
        isEditing ? `/api/human-capital/employees/${selectedEmployee?.id}` : '/api/human-capital/employees',
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
        throw new Error(data?.message ?? 'No se pudo guardar el empleado.')
      }

      setFeedback({
        type: 'success',
        message: isEditing ? 'Empleado actualizado correctamente.' : 'Empleado creado correctamente.'
      })

      closeDialog()
      await loadEmployees()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al guardar empleado.'
      })
    } finally {
      setSaving(false)
    }
  }

  const deactivateEmployee = async (employee: HumanCapitalEmployee) => {
    const confirmed = window.confirm(`¿Seguro que deseas desactivar a ${employee.fullName}?`)

    if (!confirmed) return

    setFeedback(null)

    try {
      const response = await fetch(`/api/human-capital/employees/${employee.id}`, {
        method: 'DELETE'
      })

      const data = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(data?.message ?? 'No se pudo desactivar el empleado.')
      }

      setFeedback({
        type: 'success',
        message: 'Empleado desactivado correctamente.'
      })

      await loadEmployees()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al desactivar empleado.'
      })
    }
  }

  return (
    <Box sx={{ p: 5 }}>
      <Stack spacing={4}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={3}>
          <Box>
            <Typography variant='h4'>Empleados</Typography>
            <Typography variant='body2' color='text.secondary'>
              Expediente básico de empleados por tenant con departamento, puesto y estado.
            </Typography>
          </Box>

          <Box>
            <Button variant='contained' startIcon={<i className='ri-user-add-line' />} onClick={openCreateDialog}>
              Nuevo empleado
            </Button>
          </Box>
        </Stack>

        {feedback && <Alert severity={feedback.type}>{feedback.message}</Alert>}

        <Card>
          <CardContent>
            <Stack spacing={4}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label='Buscar'
                    value={search}
                    onChange={event => {
                      setSearch(event.target.value)
                      setPage(0)
                    }}
                    placeholder='Nombre, apellido, correo o número de empleado'
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel id='employee-status-filter-label'>Estado</InputLabel>
                    <Select
                      labelId='employee-status-filter-label'
                      label='Estado'
                      value={status}
                      onChange={event => {
                        setStatus(event.target.value as EmploymentStatus | 'all')
                        setPage(0)
                      }}
                    >
                      <MenuItem value='all'>Todos</MenuItem>
                      <MenuItem value='active'>Activo</MenuItem>
                      <MenuItem value='inactive'>Inactivo</MenuItem>
                      <MenuItem value='on_leave'>Permiso</MenuItem>
                      <MenuItem value='terminated'>Terminado</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel id='employee-active-filter-label'>Activo</InputLabel>
                    <Select
                      labelId='employee-active-filter-label'
                      label='Activo'
                      value={active}
                      onChange={event => {
                        setActive(event.target.value as 'true' | 'false' | 'all')
                        setPage(0)
                      }}
                    >
                      <MenuItem value='true'>Activos</MenuItem>
                      <MenuItem value='false'>Inactivos</MenuItem>
                      <MenuItem value='all'>Todos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider />

              <TableContainer component={Paper} variant='outlined'>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Empleado</TableCell>
                      <TableCell>Contacto</TableCell>
                      <TableCell>Departamento</TableCell>
                      <TableCell>Puesto</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align='right'>Acciones</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Stack alignItems='center' spacing={2} sx={{ py: 6 }}>
                            <CircularProgress />
                            <Typography variant='body2' color='text.secondary'>
                              Cargando empleados...
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant='body2' color='text.secondary' align='center' sx={{ py: 6 }}>
                            No hay empleados para mostrar.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map(employee => (
                        <TableRow key={employee.id} hover>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography fontWeight={600}>{employee.fullName}</Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {employee.employeeNumber ? `No. ${employee.employeeNumber}` : 'Sin número'}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant='body2'>{employee.email ?? 'Sin correo'}</Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {employee.phone ?? 'Sin teléfono'}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell>{employee.departmentName ?? 'Sin departamento'}</TableCell>
                          <TableCell>{employee.positionName ?? 'Sin puesto'}</TableCell>

                          <TableCell>
                            <Chip
                              label={statusLabels[employee.employmentStatus]}
                              color={statusColors[employee.employmentStatus]}
                              size='small'
                              variant={employee.isActive ? 'filled' : 'outlined'}
                            />
                          </TableCell>

                          <TableCell align='right'>
                            <Tooltip title='Editar'>
                              <IconButton onClick={() => openEditDialog(employee)}>
                                <i className='ri-pencil-line' />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title='Desactivar'>
                              <span>
                                <IconButton
                                  color='error'
                                  onClick={() => deactivateEmployee(employee)}
                                  disabled={!employee.isActive}
                                >
                                  <i className='ri-user-unfollow-line' />
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

              <TablePagination
                component='div'
                count={total}
                page={page}
                rowsPerPage={pageSize}
                rowsPerPageOptions={[10, 25, 50, 100]}
                onPageChange={(_event, value) => setPage(value)}
                onRowsPerPageChange={event => {
                  setPageSize(Number(event.target.value))
                  setPage(0)
                }}
              />
            </Stack>
          </CardContent>
        </Card>
        <EmployeeMfaResetCard />
      </Stack>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth='md' fullWidth>
        <DialogTitle>{selectedEmployee ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>

        <DialogContent>
          <Stack spacing={4} sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='Número de empleado'
                  value={form.employeeNumber}
                  onChange={event => updateForm('employeeNumber', event.target.value)}
                  fullWidth
                  disabled={saving}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='Nombre'
                  value={form.firstName}
                  onChange={event => updateForm('firstName', event.target.value)}
                  fullWidth
                  required
                  disabled={saving}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='Apellido'
                  value={form.lastName}
                  onChange={event => updateForm('lastName', event.target.value)}
                  fullWidth
                  required
                  disabled={saving}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label='Correo'
                  value={form.email}
                  onChange={event => updateForm('email', event.target.value)}
                  fullWidth
                  type='email'
                  disabled={saving}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label='Teléfono'
                  value={form.phone}
                  onChange={event => updateForm('phone', event.target.value)}
                  fullWidth
                  disabled={saving}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id='employee-department-label'>Departamento</InputLabel>
                  <Select
                    labelId='employee-department-label'
                    label='Departamento'
                    value={form.departmentId}
                    onChange={event => updateForm('departmentId', event.target.value)}
                    disabled={saving}
                  >
                    <MenuItem value=''>Sin departamento</MenuItem>
                    {catalogs.departments.map(department => (
                      <MenuItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id='employee-position-label'>Puesto</InputLabel>
                  <Select
                    labelId='employee-position-label'
                    label='Puesto'
                    value={form.positionId}
                    onChange={event => updateForm('positionId', event.target.value)}
                    disabled={saving}
                  >
                    <MenuItem value=''>Sin puesto</MenuItem>
                    {filteredPositions.map(position => (
                      <MenuItem key={position.id} value={String(position.id)}>
                        {position.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel id='employee-status-label'>Estado</InputLabel>
                  <Select
                    labelId='employee-status-label'
                    label='Estado'
                    value={form.employmentStatus}
                    onChange={event => updateForm('employmentStatus', event.target.value as EmploymentStatus)}
                    disabled={saving}
                  >
                    <MenuItem value='active'>Activo</MenuItem>
                    <MenuItem value='inactive'>Inactivo</MenuItem>
                    <MenuItem value='on_leave'>Permiso</MenuItem>
                    <MenuItem value='terminated'>Terminado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='Fecha de ingreso'
                  value={form.hireDate}
                  onChange={event => updateForm('hireDate', event.target.value)}
                  fullWidth
                  type='date'
                  disabled={saving}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='Fecha de baja'
                  value={form.terminationDate}
                  onChange={event => updateForm('terminationDate', event.target.value)}
                  fullWidth
                  type='date'
                  disabled={saving}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={saveEmployee}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color='inherit' /> : null}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default HumanCapitalEmployeesView
