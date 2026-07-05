'use client'

import { Suspense, useState } from 'react'

import { signIn } from 'next-auth/react'
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
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'

import classnames from 'classnames'

import Logo from '@components/layout/shared/Logo'
import Illustrations from '@components/Illustrations'

import { useSettings } from '@core/hooks/useSettings'

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
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin/tenants'
  const { settings } = useSettings()

  const darkImg = '/images/pages/auth-v2-mask-dark.png'
  const lightImg = '/images/pages/auth-v2-mask-light.png'
  const darkIllustration = '/images/illustrations/auth/v2-login-dark.png'
  const lightIllustration = '/images/illustrations/auth/v2-login-light.png'
  const borderedDarkIllustration = '/images/illustrations/auth/v2-login-dark-border.png'
  const borderedLightIllustration = '/images/illustrations/auth/v2-login-light-border.png'

  const mode = settings.mode === 'system' ? 'light' : settings.mode

  const authBackground = mode === 'dark' ? darkImg : lightImg
  const characterIllustration =
    mode === 'dark' ? darkIllustration : lightIllustration

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
          setIsSubmitting(false)

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
          setIsSubmitting(false)

          return
        }

        setMfaSetupRequired(false)
        setMfaSetupData(null)
        setShowManualKey(false)
        setMfaStep(false)
        setChallengeId(null)
        setErrorState({ message: ['Configuración completada. Ahora inicia sesión nuevamente.'] })
        setIsSubmitting(false)

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
          setIsSubmitting(false)

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
            setIsSubmitting(false)

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
          setIsSubmitting(false)

          return
        }

        setChallengeId(result.challengeId)
        setMfaStep(true)
        setMfaSetupRequired(false)
        setMfaSetupData(null)
        setIsSubmitting(false)

        return
      }

      if (!challengeId) {
        setErrorState({ message: ['El desafío MFA ha expirado. Intenta de nuevo.'] })
        setMfaStep(false)
        setIsSubmitting(false)

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
        window.location.replace(callbackUrl)

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
          'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden',
          {
            'border-ie': settings.skin === 'bordered'
          }
        )}
      >
        <div className='plb-12 pis-12'>
          <img
            src={characterIllustration}
            alt='character-illustration'
            className='max-bs-[500px] max-is-full bs-auto'
          />
        </div>
        <Illustrations
          image1={{ src: '/images/illustrations/objects/tree-2.png' }}
          image2={null}
          maskImg={{ src: authBackground }}
        />
      </div>
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <div className='flex flex-col gap-5 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset]'>
          <div>
            <div className='flex justify-center py-2'>
              <Logo />
            </div>
            <Typography align='center'>
              {mfaSetupRequired
                ? 'Configura tu verificación en dos pasos'
                : mfaStep
                  ? 'Ingresa tu código MFA'
                  : 'Inicia sesión para acceder al panel de administración'}
            </Typography>
          </div>

          {errorState && (
            <Alert severity='error'>
              {errorState.message[0]}
            </Alert>
          )}

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
                  label='Usuario'
                  onChange={e => {
                    field.onChange(e.target.value)
                    if (errorState !== null) setErrorState(null)
                  }}
                  {...(errors.user && { error: true, helperText: errors.user.message })}
                />
              )}
            />

            {!mfaStep && (
              <Controller
                name='password'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    disabled={isSubmitting}
                    label='Contraseña'
                    type={isPasswordShown ? 'text' : 'password'}
                    onChange={e => {
                      field.onChange(e.target.value)
                      if (errorState !== null) setErrorState(null)
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
            )}

            {(mfaStep || mfaSetupRequired) && (
              <Controller
                name='mfaCode'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={mfaSetupRequired ? 'Código de verificación' : 'Código MFA'}
                    placeholder='000000'
                    disabled={isSubmitting}
                    onChange={e => {
                      field.onChange(e.target.value)
                      if (errorState !== null) setErrorState(null)
                    }}
                    inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
                    {...(errorState !== null && {
                      error: true,
                      helperText: errorState.message[0]
                    })}
                  />
                )}
              />
            )}

            {mfaSetupRequired && mfaSetupData && (
              <div className='flex flex-col gap-5 rounded-xl border border-divider bg-backgroundPaper p-5 shadow-sm'>
                <div className='flex flex-col gap-1 text-center'>
                  <Typography className='font-semibold'>Configura Google Authenticator</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Escanea el código QR para activar la verificación en dos pasos.
                  </Typography>
                </div>

                <div className='mx-auto rounded-xl bg-backgroundPaper p-4 shadow-md'>
                  <QRCodeSVG value={mfaSetupData.otpauthUrl} size={180} />
                </div>

                <div className='flex flex-col gap-2 rounded-lg bg-actionHover p-4'>
                  <Typography variant='body2'>1. Abre Google Authenticator en tu celular.</Typography>
                  <Typography variant='body2'>2. Toca el botón +.</Typography>
                  <Typography variant='body2'>3. Selecciona &quot;Escanear código QR&quot;.</Typography>
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
              </div>
            )}

            <Button
              type='submit'
              variant='contained'
              size='large'
              fullWidth
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color='inherit' /> : null}
            >
              {isSubmitting
                ? 'Por favor espera...'
                : mfaSetupRequired
                  ? 'Verificar código'
                  : mfaStep
                    ? 'Ingresar'
                    : 'Continuar'}
            </Button>

            {(mfaSetupRequired || mfaStep) && (
              <Button
                type='button'
                variant='outlined'
                fullWidth
                onClick={() => {
                  setMfaStep(false)
                  setMfaSetupRequired(false)
                  setMfaSetupData(null)
                  setShowManualKey(false)
                  setChallengeId(null)
                  setErrorState(null)
                }}
                disabled={isSubmitting}
              >
                Volver
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