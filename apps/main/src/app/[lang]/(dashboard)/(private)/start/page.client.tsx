'use client'

import { useState, useEffect } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'

import type { Locale } from '@configs/i18n'

type StartProps = {
  dictionary: {
    start: {
      heroTitle: string
      heroSubtitle: string
      activityHeading: string
      humanCapital: string
      warehouses: string
      quotes: string
      projects: string
      operatingExpenses: string
      fleets: string
      didYouKnow: string
      tips: string[]
    }
  }
  locale: Locale
}

const cards = [
  { key: 'humanCapital', href: '/human-capital/employees', icon: 'ri-user-heart-line' },
  { key: 'warehouses', href: '/warehouses/warehouse-map', icon: 'ri-store-2-line' },
  { key: 'quotes', href: '/quotes', icon: 'ri-file-text-line' },
  { key: 'projects', href: '/projects/active-projects', icon: 'ri-briefcase-line' },
  { key: 'operatingExpenses', href: '/operating-expenses/expense-requests', icon: 'ri-wallet-line' },
  { key: 'fleets', href: '/fleets/vehicle-expense-control', icon: 'ri-truck-line' }
]

const StartView = ({ dictionary, locale }: StartProps) => {
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % dictionary.start.tips.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [dictionary.start.tips.length])

  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: 300, md: 420 },
          borderRadius: '15px',
          overflow: 'hidden',
          mb: 4,
          backgroundImage: 'url(/images/redes.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.45)'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '70%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            textAlign: 'center',
            zIndex: 10,
            width: '100%'
          }}
        >
          <Typography
            variant='h2'
            component='h1'
            sx={{
              fontSize: { xs: '36px', md: '68px' },
              fontWeight: 700,
              color: '#ffffff',
              textShadow: '0 2px 4px rgba(0,0,0,0.6)',
              animation: 'entradaSuave 1.2s ease-out forwards',
              '@keyframes entradaSuave': {
                '0%': { opacity: 0, transform: 'translateY(30px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' }
              }
            }}
          >
            {dictionary.start.heroTitle}
          </Typography>
          <Typography
            variant='h4'
            component='h3'
            sx={{
              color: 'rgba(255,255,255,0.92)',
              fontWeight: 400,
              animation: 'entradaSuave 1.2s ease-out 0.3s forwards',
              animationFillMode: 'both',
              '@keyframes entradaSuave': {
                '0%': { opacity: 0, transform: 'translateY(30px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' }
              }
            }}
          >
            {dictionary.start.heroSubtitle}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant='h5' sx={{ fontWeight: 600, mb: 1 }}>
          {dictionary.start.activityHeading}
        </Typography>
        <Box
          sx={{
            width: { xs: '100%', md: 770 },
            mx: 'auto',
            borderTop: '2px solid',
            borderColor: 'divider'
          }}
        />
      </Box>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        {cards.map(card => (
          <Grid key={card.key} size={{ xs: 6, md: 4, lg: 2 }}>
            <Link href={`/${locale}${card.href}`} style={{ textDecoration: 'none' }}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 0 10px 3px rgba(33, 150, 243, 0.8)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: 'primary.main' }}>
                  <i className={`${card.icon} text-3xl`} />
                </Box>
                <Typography variant='body2' sx={{ fontWeight: 600, mb: 1 }}>
                  {dictionary.start[card.key as keyof typeof dictionary.start]}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'primary.main' }}>
                  <i className='ri-add-line' />
                </Box>
              </Box>
            </Link>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography
          variant='h6'
          sx={{
            fontWeight: 600,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}
        >
          <i className='ri-lightbulb-line' style={{ color: '#FFD43B', animation: 'pulse 1.5s infinite' }} />
          {dictionary.start.didYouKnow}
        </Typography>
        <Box
          sx={{
            width: { xs: '95%', md: '80%' },
            maxWidth: 600,
            mx: 'auto',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            p: 3,
            minHeight: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
          }}
        >
          <Typography variant='body1' sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {dictionary.start.tips[tipIndex]}
          </Typography>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
          {dictionary.start.tips.map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: i === tipIndex ? 'primary.main' : 'divider',
                transition: 'background-color 0.3s ease'
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export default StartView
