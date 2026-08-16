'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type ResetState = {
    type: 'success' | 'error' | 'info'
    message: string
} | null

const EmployeeMfaResetCard = () => {
    const [userId, setUserId] = useState('')
    const [reason, setReason] = useState('Lost authenticator device')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<ResetState>(null)

    const handleResetMfa = async () => {
        setResult(null)

        const parsedUserId = Number(userId)

        if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
            setResult({
                type: 'error',
                message: 'Captura un IdUsuario válido.'
            })

            return
        }

        const confirmed = window.confirm(
            '¿Seguro que deseas restablecer el MFA de este usuario? El usuario deberá configurar Google Authenticator nuevamente en su próximo inicio de sesión.'
        )

        if (!confirmed) return

        try {
            setLoading(true)

            const response = await fetch(`/api/admin/users/${parsedUserId}/mfa/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: reason.trim() || 'Admin MFA reset'
                })
            })

            const data = await response.json().catch(() => null)

            if (!response.ok || !data?.ok) {
                setResult({
                    type: 'error',
                    message: data?.message?.[0] ?? 'No se pudo restablecer el MFA.'
                })

                return
            }

            setResult({
                type: 'success',
                message:
                    data.updatedRows > 0
                        ? 'MFA restablecido correctamente. El usuario deberá configurar Google Authenticator nuevamente.'
                        : 'La operación terminó correctamente, pero no había un factor MFA activo para ese usuario.'
            })
        } catch {
            setResult({
                type: 'error',
                message: 'Error de red o servidor al restablecer MFA.'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardContent>
                <Stack spacing={4}>
                    <Box>
                        <Typography variant='h6'>Acciones de seguridad</Typography>
                        <Typography variant='body2' color='text.secondary'>
                            Herramientas administrativas relacionadas con el acceso de usuarios.
                        </Typography>
                    </Box>

                    <Divider />

                    <Stack spacing={3} maxWidth={520}>
                        <Box>
                            <Typography variant='subtitle1' fontWeight={600}>
                                Restablecer MFA de usuario
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                                Usa esta acción cuando un usuario perdió acceso a Google Authenticator. El MFA anterior se desactivará
                                y el usuario deberá enrolar un nuevo código QR en su próximo inicio de sesión.
                            </Typography>
                        </Box>

                        <TextField
                            label='IdUsuario'
                            value={userId}
                            onChange={event => setUserId(event.target.value)}
                            placeholder='Ej. 144'
                            type='number'
                            fullWidth
                            disabled={loading}
                        />

                        <TextField
                            label='Motivo'
                            value={reason}
                            onChange={event => setReason(event.target.value)}
                            placeholder='Ej. Usuario perdió acceso a Google Authenticator'
                            fullWidth
                            multiline
                            minRows={2}
                            disabled={loading}
                        />

                        {result && <Alert severity={result.type}>{result.message}</Alert>}

                        <Box>
                            <Button
                                variant='contained'
                                color='warning'
                                onClick={handleResetMfa}
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={18} color='inherit' /> : null}
                            >
                                {loading ? 'Restableciendo...' : 'Restablecer MFA'}
                            </Button>
                        </Box>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    )
}

export default EmployeeMfaResetCard
