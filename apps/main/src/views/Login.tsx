'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

// MUI Imports
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'

// Third-party Imports
import { signIn } from 'next-auth/react'
import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, minLength, string, /* email, */ pipe, nonEmpty } from 'valibot'
import classnames from 'classnames'
import type { SubmitHandler } from 'react-hook-form'
import type { InferInput } from 'valibot'
import { QRCodeSVG } from 'qrcode.react'

// Type Imports
import type { Mode } from '@core/types'
import type { Locale } from '@configs/i18n'

// Component Imports
import Logo from '@components/layout/shared/Logo'
import Illustrations from '@components/Illustrations'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'
import { useSettings } from '@core/hooks/useSettings'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

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
  user: pipe(string(), minLength(1, 'This field is required')),
  password: pipe(
    string(),
    nonEmpty('This field is required'),
    minLength(5, 'Password must be at least 5 characters long')
  ),
  mfaCode: string()
})

const Login = ({ mode }: { mode: Mode }) => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [errorState, setErrorState] = useState<ErrorType | null>(null)
  const [mfaStep, setMfaStep] = useState(false)
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false)
  const [mfaSetupData, setMfaSetupData] = useState<MfaSetupData | null>(null)
  const [showManualKey, setShowManualKey] = useState(false)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Vars
  const darkImg = '/images/pages/auth-v2-mask-dark.png'
  const lightImg = '/images/pages/auth-v2-mask-light.png'
  const darkIllustration = '/images/illustrations/auth/v2-login-dark.png'
  const lightIllustration = '/images/illustrations/auth/v2-login-light.png'
  const borderedDarkIllustration = '/images/illustrations/auth/v2-login-dark-border.png'
  const borderedLightIllustration = '/images/illustrations/auth/v2-login-light-border.png'

  // Hooks
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { settings } = useSettings()

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

  const authBackground = useImageVariant(mode, lightImg, darkImg)

  const characterIllustration = useImageVariant(
    mode,
    lightIllustration,
    darkIllustration,
    borderedLightIllustration,
    borderedDarkIllustration
  )

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const onSubmit: SubmitHandler<FormData> = async (data: FormData) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    setErrorState(null)

    try {
      if (mfaSetupRequired) {
        if (!mfaSetupData?.setupId) {
          setErrorState({
            message: ['MFA setup session is missing. Please try again.']
          })

          return
        }

        const setupVerifyRes = await fetch('/api/auth-mfa/setup/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
        setErrorState({
          message: ['Configuración completada. Ahora inicia sesión nuevamente.']
        })

        return
      }

      if (!mfaStep) {
        const res = await fetch('/api/auth-mfa/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: data.user,
            password: data.password
          })
        })

        const result = await res.json()

        if (!res.ok) {
          setErrorState(result)

          return
        }

        if (result.requiresMfaSetup) {
          const setupRes = await fetch('/api/auth-mfa/setup/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: data.user,
              password: data.password
            })
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
        setErrorState({
          message: ['MFA challenge is missing. Please try again.']
        })

        setMfaStep(false)

        return
      }

      const res = await signIn('credentials', {
        user: data.user,
        password: data.password,
        challengeId,
        mfaCode: data.mfaCode,
        redirect: false
      })

      if (res && res.ok && res.error === null) {
        const redirectURL = searchParams.get('redirectTo') ?? '/'

        router.replace(getLocalizedUrl(redirectURL, locale as Locale))

        return
      }

      if (res?.error) {
        const error = JSON.parse(res.error)

        setErrorState(error)
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
            <Typography>Inicia sesión para acceder a tu cuenta</Typography>

            {mfaSetupRequired && (
              <Alert severity='info' className='mt-4'>
                Tu cuenta requiere configurar la verificación en dos pasos. Escanea el código QR con Google
                Authenticator.
              </Alert>
            )}
          </div>

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
                  disabled={mfaStep}
                  type='user'
                  label='User'
                  onChange={e => {
                    field.onChange(e.target.value)
                    errorState !== null && setErrorState(null)
                  }}
                  {...((errors.user || errorState !== null) && {
                    error: true,
                    helperText: errorState?.message
                      ? errorState?.message[0]
                      : (errorState?.name ?? 'Error del servidor. Por favor intente de nuevo mas tarde.')
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
                  disabled={mfaStep}
                  label='Password'
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
              <Typography className='text-end' color='primary.main' component={Link} href='/forgot-password'>
                ¿Olvidaste tu contraseña?
              </Typography>
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

                  <Typography variant='body2'>3. Selecciona “Escanear código QR”.</Typography>

                  <Typography variant='body2'>4. Ingresa abajo el código de 6 dígitos generado por la app.</Typography>
                </div>

                <Button variant='text' type='button' onClick={() => setShowManualKey(show => !show)}>
                  {showManualKey ? 'Ocultar clave manual' : 'No puedo escanear el QR'}
                </Button>

                {showManualKey && (
                  <Typography variant='body2' className='break-all rounded bg-actionHover p-2 text-center font-mono'>
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

export default Login
