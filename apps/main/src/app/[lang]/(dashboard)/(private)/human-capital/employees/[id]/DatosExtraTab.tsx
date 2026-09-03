'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid2'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { REGION_OPTIONS, SEXO_OPTIONS, TIPO_SANGRE_OPTIONS } from '@gaso/shared'

type EmployeeData = {
  curp: string | null
  rfc: string | null
  nss: string | null
  fechaNacimiento: string | null
  sueldo: number | null
  tieneLicencia: boolean | null
  fechaCaducidadLicencia: string | null
  fechaDC3: string | null
  sexo: string | null
  tipoSangre: string | null
  regionId: number | null
  areaId: number | null
  areaName: string | null
  supervisorEmployeeId: number | null
  supervisorName: string | null
}

type AreaOption = { id: number; name: string }
type SupervisorOption = { id: number; label: string }

type FormState = {
  curp: string
  rfc: string
  nss: string
  fechaNacimiento: string
  sueldo: string
  tieneLicencia: boolean
  fechaCaducidadLicencia: string
  fechaDC3: string
  sexo: string
  tipoSangre: string
  regionId: string
  areaId: string
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null

type DatosExtraTabProps = {
  employeeId: number
  canEdit?: boolean
}

const emptyForm: FormState = {
  curp: '',
  rfc: '',
  nss: '',
  fechaNacimiento: '',
  sueldo: '',
  tieneLicencia: false,
  fechaCaducidadLicencia: '',
  fechaDC3: '',
  sexo: '',
  tipoSangre: '',
  regionId: '',
  areaId: ''
}

const DatosExtraTab = ({ employeeId, canEdit = false }: DatosExtraTabProps) => {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [supervisor, setSupervisor] = useState<SupervisorOption | null>(null)
  const [supOptions, setSupOptions] = useState<SupervisorOption[]>([])
  const [supInput, setSupInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const loadData = useCallback(async () => {
    setLoading(true)
    setFeedback(null)

    try {
      const [dataRes, areasRes] = await Promise.all([
        fetch(`/api/human-capital/employees/${employeeId}/data`),
        fetch('/api/human-capital/catalogs/areas')
      ])

      const dataJson = (await dataRes.json().catch(() => null)) as { data?: EmployeeData | null } | null

      const areasJson = (await areasRes.json().catch(() => null)) as {
        rows?: Array<{ Id: number; Nombre: string; Activo: boolean }>
      } | null

      if (areasJson?.rows) {
        setAreas(areasJson.rows.filter(r => r.Activo).map(r => ({ id: r.Id, name: r.Nombre })))
      }

      const d = dataJson?.data ?? null

      if (d) {
        setForm({
          curp: d.curp ?? '',
          rfc: d.rfc ?? '',
          nss: d.nss ?? '',
          fechaNacimiento: d.fechaNacimiento ?? '',
          sueldo: d.sueldo === null ? '' : String(d.sueldo),
          tieneLicencia: Boolean(d.tieneLicencia),
          fechaCaducidadLicencia: d.fechaCaducidadLicencia ?? '',
          fechaDC3: d.fechaDC3 ?? '',
          sexo: d.sexo ?? '',
          tipoSangre: d.tipoSangre ?? '',
          regionId: d.regionId === null ? '' : String(d.regionId),
          areaId: d.areaId === null ? '' : String(d.areaId)
        })

        if (d.supervisorEmployeeId) {
          setSupervisor({ id: d.supervisorEmployeeId, label: d.supervisorName ?? `#${d.supervisorEmployeeId}` })
        }
      } else {
        setForm(emptyForm)
        setSupervisor(null)
      }
    } catch {
      setFeedback({ type: 'error', message: 'No se pudieron cargar los datos.' })
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Autocomplete de supervisor: búsqueda server-side con debounce.
  useEffect(() => {
    const query = supInput.trim()

    if (!query) {
      setSupOptions([])

      return
    }

    const handle = setTimeout(async () => {
      try {
        const response = await fetch(`/api/human-capital/employees?search=${encodeURIComponent(query)}&pageSize=20`)

        const data = (await response.json().catch(() => null)) as {
          data?: Array<{
            id: number
            employeeNumber?: string | null
            fullName?: string
            firstName?: string
            lastName?: string
          }>
        } | null

        const items = (data?.data ?? [])
          .filter(e => e.id !== employeeId)
          .map(e => ({
            id: e.id,
            label: `${e.employeeNumber ? `${e.employeeNumber} - ` : ''}${e.fullName ?? `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim()}`
          }))

        setSupOptions(items)
      } catch {
        setSupOptions([])
      }
    }, 400)

    return () => clearTimeout(handle)
  }, [supInput, employeeId])

  const submit = async () => {
    setSaving(true)
    setFeedback(null)

    const body = {
      curp: form.curp.trim() || null,
      rfc: form.rfc.trim() || null,
      nss: form.nss.trim() || null,
      fechaNacimiento: form.fechaNacimiento || null,
      sueldo: form.sueldo === '' ? null : Number(form.sueldo),
      tieneLicencia: form.tieneLicencia,
      fechaCaducidadLicencia: form.tieneLicencia ? form.fechaCaducidadLicencia || null : null,
      fechaDC3: form.fechaDC3 || null,
      sexo: form.sexo || null,
      tipoSangre: form.tipoSangre || null,
      regionId: form.regionId === '' ? null : Number(form.regionId),
      areaId: form.areaId === '' ? null : Number(form.areaId),
      supervisorEmployeeId: supervisor ? supervisor.id : null
    }

    try {
      const response = await fetch(`/api/human-capital/employees/${employeeId}/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(data && data.message ? data.message : 'No se pudieron guardar los datos.')
      }

      setFeedback({ type: 'success', message: 'Datos guardados.' })
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Error al guardar.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Stack alignItems='center' sx={{ py: 4 }}>
        <CircularProgress />
      </Stack>
    )
  }

  const disabled = !canEdit || saving

  return (
    <Stack spacing={3}>
      {feedback ? (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label='CURP'
            value={form.curp}
            onChange={e => setField('curp', e.target.value)}
            fullWidth
            disabled={disabled}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label='RFC'
            value={form.rfc}
            onChange={e => setField('rfc', e.target.value)}
            fullWidth
            disabled={disabled}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label='NSS'
            value={form.nss}
            onChange={e => setField('nss', e.target.value)}
            fullWidth
            disabled={disabled}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label='Fecha de nacimiento'
            type='date'
            value={form.fechaNacimiento}
            onChange={e => setField('fechaNacimiento', e.target.value)}
            fullWidth
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label='Sueldo'
            type='number'
            value={form.sueldo}
            onChange={e => setField('sueldo', e.target.value)}
            fullWidth
            disabled={disabled}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label='Fecha DC-3'
            type='date'
            value={form.fechaDC3}
            onChange={e => setField('fechaDC3', e.target.value)}
            fullWidth
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth disabled={disabled}>
            <InputLabel id='sexo-label'>Sexo</InputLabel>
            <Select
              labelId='sexo-label'
              label='Sexo'
              value={form.sexo}
              onChange={e => setField('sexo', String(e.target.value))}
            >
              <MenuItem value=''>Sin especificar</MenuItem>
              {SEXO_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth disabled={disabled}>
            <InputLabel id='sangre-label'>Tipo de sangre</InputLabel>
            <Select
              labelId='sangre-label'
              label='Tipo de sangre'
              value={form.tipoSangre}
              onChange={e => setField('tipoSangre', String(e.target.value))}
            >
              <MenuItem value=''>Sin especificar</MenuItem>
              {TIPO_SANGRE_OPTIONS.map(opt => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth disabled={disabled}>
            <InputLabel id='region-label'>Región</InputLabel>
            <Select
              labelId='region-label'
              label='Región'
              value={form.regionId}
              onChange={e => setField('regionId', String(e.target.value))}
            >
              <MenuItem value=''>Sin región</MenuItem>
              {REGION_OPTIONS.map(opt => (
                <MenuItem key={opt} value={String(opt)}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth disabled={disabled}>
            <InputLabel id='area-label'>Área</InputLabel>
            <Select
              labelId='area-label'
              label='Área'
              value={form.areaId}
              onChange={e => setField('areaId', String(e.target.value))}
            >
              <MenuItem value=''>Sin área</MenuItem>
              {areas.map(area => (
                <MenuItem key={area.id} value={String(area.id)}>
                  {area.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete
            options={supOptions}
            value={supervisor}
            onChange={(_event, value) => setSupervisor(value)}
            inputValue={supInput}
            onInputChange={(_event, value) => setSupInput(value)}
            getOptionLabel={option => option.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            disabled={disabled}
            noOptionsText='Escribe para buscar…'
            renderInput={params => <TextField {...params} label='Supervisor' />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControlLabel
            control={
              <Switch
                checked={form.tieneLicencia}
                onChange={e => setField('tieneLicencia', e.target.checked)}
                disabled={disabled}
              />
            }
            label='Tiene licencia de conducir'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label='Caducidad de licencia'
            type='date'
            value={form.fechaCaducidadLicencia}
            onChange={e => setField('fechaCaducidadLicencia', e.target.value)}
            fullWidth
            disabled={disabled || !form.tieneLicencia}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      {canEdit ? (
        <Stack direction='row' justifyContent='flex-end'>
          <Button
            variant='contained'
            onClick={submit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color='inherit' /> : null}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </Stack>
      ) : (
        <Typography variant='caption' color='text.secondary'>
          Solo lectura.
        </Typography>
      )}
    </Stack>
  )
}

export default DatosExtraTab
