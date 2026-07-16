'use client'

import { Suspense, useState } from 'react'

import { signIn, getSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, minLength, string, pipe, nonEmpty } from 'valibot'
import type { InferInput } from 'valibot'
import type { SubmitHandler } from 'react-hook-form'
import { QRCodeSVG } from 'qrcode.react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Image from 'next/image'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'

import classnames from 'classnames'

import Logo from '@components/layout/shared/Logo'
import Illustrations from '@components/Illustrations'

import { useSettings } from '@core/hooks/useSettings'
import { useImageVariant } from '@core/hooks/useImageVariant'

type ErrorType = {
  name?: string
  message: string[]
}

type FormData = InferInput<typeof schema>

type MfaSetupData = {
  setupId: string | null
  otpauthUrl: string
  manualKey: string
  issuer: string
  accountName: string
}

const schema = object({
  user: pipe(string(), minLength(1, 'Este campo es requerido')),
  password: pipe(
    string(),
    nonEmpty('Este campo es requerido'),
    minLength(5, 'La contraseña debe tener al menos 5 caracteres')
  ),
  mfaCode: string()
})

const AdminLoginForm = () => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [errorState, setErrorState] = useState<ErrorType | null>(null)
  const [mfaStep, setMfaStep] = useState(false)
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false)
  const [mfaSetupData, setMfaSetupData] = useState<MfaSetupData | null>(null)
  const [showManualKey, setShowManualKey] = useState(false)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin'
  const { settings } = useSettings()

  const darkImg = '/images/pages/auth-v2-mask-dark.png'
  const lightImg = '/images/pages/auth-v2-mask-light.png'
  const darkIllustration = '/images/illustrations/auth/v2-login-dark.png'
  const lightIllustration = '/images/illustrations/auth/v2-login-light.png'
  const borderedDarkIllustration = '/images/illustrations/auth/v2-login-dark-border.png'
  const borderedLightIllustration = '/images/illustrations/auth/v2-login-light-border.png'

  const mode = settings.mode === 'system' ? 'light' : settings.mode ?? 'light'

  const authBackground = useImageVariant(mode, lightImg, darkImg)
  const characterIllustration = useImageVariant(
    mode,
    lightIllustration,
    darkIllustration,
    borderedLightIllustration,
    borderedDarkIllustration
  )

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      user: '',
      password: '',
      mfaCode: ''
    }
  })

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const onSubmit: SubmitHandler<FormData> = async (data: FormData) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    setErrorState(null)

    try {
      if (mfaSetupRequired) {
        if (!mfaSetupData?.setupId) {
          setErrorState({ message: ['La sesión de configuración MFA ha expirado. Intenta de nuevo.'] })

          return
        }

        const setupVerifyRes = await fetch('/api/admin/auth-mfa/setup/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: data.user,
            password: data.password,
            setupId: mfaSetupData.setupId,
            mfaCode: data.mfaCode
          })
        })

        const setupVerifyResult = await setupVerifyRes.json()

        if (!setupVerifyRes.ok) {
          setErrorState(setupVerifyResult)

          return
        }

        setMfaSetupRequired(false)
        setMfaSetupData(null)
        setShowManualKey(false)
        setMfaStep(false)
        setChallengeId(null)
        setErrorState({ message: ['Configuración completada. Ahora inicia sesión nuevamente.'] })

        return
      }

      if (!mfaStep) {
        const res = await fetch('/api/admin/auth-mfa/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.user, password: data.password })
        })

        const result = await res.json()

        if (!res.ok) {
          setErrorState(result)

          return
        }

        if (result.requiresMfaSetup) {
          const setupRes = await fetch('/api/admin/auth-mfa/setup/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: data.user, password: data.password })
          })

          const setupResult = await setupRes.json()

          if (!setupRes.ok) {
            setErrorState(setupResult)

            return
          }

          setChallengeId(null)
          setMfaStep(false)
          setMfaSetupRequired(true)
          setShowManualKey(false)
          setMfaSetupData({
            setupId: setupResult.setupId ?? null,
            otpauthUrl: setupResult.otpauthUrl,
            manualKey: setupResult.manualKey,
            issuer: setupResult.issuer,
            accountName: setupResult.accountName
          })
          setErrorState(null)

          return
        }

        setChallengeId(result.challengeId)
        setMfaStep(true)
        setMfaSetupRequired(false)
        setMfaSetupData(null)

        return
      }

      if (!challengeId) {
        setErrorState({ message: ['El desafío MFA ha expirado. Intenta de nuevo.'] })
        setMfaStep(false)

        return
      }

      const res = await signIn('credentials', {
        user: data.user,
        password: data.password,
        challengeId,
        mfaCode: data.mfaCode,
        loginType: 'admin',
        redirect: false
      })

      if (res && res.ok && res.error === null) {
        const session = await getSession()
        const redirectUrl = session?.user?.platformRole === 'auditor' ? '/admin/audit' : callbackUrl
        window.location.replace(redirectUrl)

        return
      }

      if (res?.error) {
        let errorMessage = 'An error occurred'
        try {
          const parsed = JSON.parse(res.error)
          errorMessage = Array.isArray(parsed.message) ? parsed.message[0] : (parsed.message || errorMessage)
        } catch {
          errorMessage = res.error || 'An error occurred'
        }
        setErrorState({ message: [errorMessage] })
        setMfaStep(false)
        setChallengeId(null)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='flex bs-full justify-center'>
      <div
        className={classnames(
          'flex-1 min-h-screen max-md:hidden relative',
          {
            'border-ie': settings.skin === 'bordered'
          }
        )}
        style={{ minHeight: '100vh' }}
      >
        <Box sx={{ width: '100%', height: '100vh', position: 'relative' }}>
          <Image
            src='/images/background.png'
            alt='background'
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            unoptimized
          />
        </Box>
      </div>
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <div className='flex flex-col gap-5 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset]'>
          <div>
            <div className='flex justify-center py-2'>
              <Logo />
            </div>
            <Typography>
              {mfaSetupRequired
                ? 'Configura tu verificación en dos pasos'
                : mfaStep
                  ? 'Ingresa tu código MFA'
                  : 'Inicia sesión para acceder al panel de administración'}
            </Typography>
          </div>

          {mfaSetupRequired && (
            <Alert severity='info'>
              Tu cuenta requiere configurar la verificación en dos pasos. Escanea el código QR con Google Authenticator.
            </Alert>
          )}

          <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
            <Controller
              name='user'
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  autoFocus
                  disabled={mfaStep || isSubmitting}
                  type='user'
                  label='Usuario'
                  onChange={e => {
                    field.onChange(e.target.value)
                    errorState !== null && setErrorState(null)
                  }}
                  {...((errors.user || errorState !== null) && {
                    error: true,
                    helperText: errorState?.message
                      ? errorState?.message[0]
                      : errors.user?.message
                  })}
                />
              )}
            />

            <Controller
              name='password'
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  disabled={mfaStep || isSubmitting}
                  label='Contraseña'
                  id='login-password'
                  type={isPasswordShown ? 'text' : 'password'}
                  onChange={e => {
                    field.onChange(e.target.value)
                    errorState !== null && setErrorState(null)
                  }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            size='small'
                            edge='end'
                            onClick={handleClickShowPassword}
                            onMouseDown={e => e.preventDefault()}
                            aria-label='toggle password visibility'
                          >
                            <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                  {...(errors.password && { error: true, helperText: errors.password.message })}
                />
              )}
            />

            {mfaStep && (
              <Controller
                name='mfaCode'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='Código MFA'
                    placeholder='Ingresa tu código de 6 dígitos'
                    onChange={e => {
                      field.onChange(e.target.value)
                      errorState !== null && setErrorState(null)
                    }}
                    {...(errorState !== null && {
                      error: true,
                      helperText: errorState?.message[0]
                    })}
                  />
                )}
              />
            )}

            <div className='flex justify-between items-center flex-wrap gap-x-3 gap-y-1'>
              <FormControlLabel control={<Checkbox defaultChecked />} label='Recordarme' />
            </div>

            {mfaSetupRequired && mfaSetupData && (
              <div className='flex flex-col gap-5 rounded-xl border border-divider bg-backgroundPaper p-5 shadow-sm'>
                <div className='flex flex-col gap-1 text-center'>
                  <Typography className='font-semibold'>Configura Google Authenticator</Typography>

                  <Typography variant='body2' color='text.secondary'>
                    Escanea el código QR para activar la verificación en dos pasos.
                  </Typography>
                </div>

                <div className='mx-auto rounded-xl bg-white p-4 shadow-md'>
                  <QRCodeSVG value={mfaSetupData.otpauthUrl} size={190} />
                </div>

                <div className='flex flex-col gap-2 rounded-lg bg-actionHover p-4'>
                  <Typography variant='body2'>1. Abre Google Authenticator en tu celular.</Typography>

                  <Typography variant='body2'>2. Toca el botón +.</Typography>

                  <Typography variant='body2'>3. Selecciona "Escanear código QR".</Typography>

                  <Typography variant='body2'>
                    4. Ingresa abajo el código de 6 dígitos generado por la app.
                  </Typography>
                </div>

                <Button variant='text' type='button' onClick={() => setShowManualKey(show => !show)}>
                  {showManualKey ? 'Ocultar clave manual' : 'No puedo escanear el QR'}
                </Button>

                {showManualKey && (
                  <Typography
                    variant='body2'
                    className='break-all rounded bg-actionHover p-2 text-center font-mono'
                  >
                    {mfaSetupData.manualKey}
                  </Typography>
                )}

                <Controller
                  name='mfaCode'
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='Código de verificación'
                      placeholder='Ingresa el código de 6 dígitos'
                      onChange={e => {
                        field.onChange(e.target.value)
                        errorState !== null && setErrorState(null)
                      }}
                      {...(errorState !== null && {
                        error: true,
                        helperText: errorState?.message[0]
                      })}
                    />
                  )}
                />
              </div>
            )}

            <Button fullWidth variant='contained' type='submit' disabled={isSubmitting}>
              {isSubmitting
                ? 'Por favor espera...'
                : mfaSetupRequired
                  ? 'Verificar código'
                  : mfaStep
                    ? 'Ingresar'
                    : 'Continuar'}
            </Button>

            {mfaSetupRequired && (
              <Button
                fullWidth
                variant='outlined'
                type='button'
                onClick={() => {
                  setMfaSetupRequired(false)
                  setMfaSetupData(null)
                  setShowManualKey(false)
                  setChallengeId(null)
                  setErrorState(null)
                }}
                disabled={isSubmitting}
              >
                Volver al inicio de sesión
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

const AdminLoginPage = () => {
  return (
    <Suspense fallback={<CircularProgress />}>
      <AdminLoginForm />
    </Suspense>
  )
}

export default AdminLoginPage
