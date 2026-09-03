'use client'

import { useRef, useState } from 'react'

import { SignatureCanvas } from 'react-signature-canvas'

import { Box, Button, Tab, Tabs, Typography } from '@mui/material'
import { toast } from 'react-toastify'

/**
 * Reduce y convierte una imagen a base64 SIN prefijo `data:` (como se guarda en
 * AspFirma). Redimensiona a maxDim y recomprime a JPEG para evitar base64 enormes
 * en la petición y en la BD. Fondo blanco (una firma no necesita alfa).
 */
export async function compressImageToBase64(file: File, maxDim = 800, quality = 0.7): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader()

    r.onload = () => res(r.result as string)
    r.onerror = () => rej(new Error('read'))
    r.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()

    i.onload = () => res(i)
    i.onerror = () => rej(new Error('img'))
    i.src = dataUrl
  })

  let { width, height } = img

  if (width >= height && width > maxDim) {
    height = Math.round((height * maxDim) / width)
    width = maxDim
  } else if (height > maxDim) {
    width = Math.round((width * maxDim) / height)
    height = maxDim
  }

  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('canvas')

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', quality).split(',')[1] // base64 sin prefijo
}

interface Props {
  value: string // base64 sin prefijo
  onChange: (base64: string) => void
}

// Firma con dos modos: dibujar (canvas) o subir imagen (comprimida). Ambos emiten
// base64 sin prefijo. La subida cubre el caso "sin equipo para dibujar".
const FirmaCapture = ({ value, onChange }: Props) => {
  const [mode, setMode] = useState<'draw' | 'upload'>('draw')
  const [busy, setBusy] = useState(false)
  const sigRef = useRef<SignatureCanvas>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const commitDraw = () => {
    const c = sigRef.current

    if (!c || c.isEmpty()) {
      onChange('')

      return
    }

    onChange(c.getTrimmedCanvas().toDataURL('image/png').split(',')[1])
  }

  const clearDraw = () => {
    sigRef.current?.clear()
    onChange('')
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    e.target.value = ''
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen excede 10 MB')

      return
    }

    setBusy(true)

    try {
      onChange(await compressImageToBase64(file))
    } catch {
      toast.error('No se pudo procesar la imagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box>
      <Tabs value={mode} onChange={(_, v) => setMode(v)} className='mbe-3'>
        <Tab value='draw' label='Dibujar' />
        <Tab value='upload' label='Subir imagen' />
      </Tabs>

      {mode === 'draw' ? (
        <Box>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: '#fff', width: 'fit-content' }}>
            <SignatureCanvas
              ref={sigRef}
              penColor='black'
              canvasProps={{ width: 400, height: 180 }}
              onEnd={commitDraw}
            />
          </Box>
          <Button size='small' color='secondary' onClick={clearDraw} className='mbs-2'>Limpiar</Button>
        </Box>
      ) : (
        <Box>
          <input ref={fileRef} type='file' accept='.jpg,.jpeg,.png' hidden onChange={onFile} />
          <Button variant='outlined' size='small' disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Procesando…' : 'Seleccionar imagen'}
          </Button>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/pngbase64,${value}`} alt='Firma' style={{ display: 'block', marginTop: 12, maxWidth: 300, border: '1px solid #eee', borderRadius: 8, background: '#fff' }} />
          ) : (
            <Typography variant='caption' color='text.secondary' className='mbs-2 block'>Sin firma</Typography>
          )}
        </Box>
      )}
    </Box>
  )
}

export default FirmaCapture
