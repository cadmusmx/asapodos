'use client'

import Box from '@mui/material/Box'

import VerticalLayout from '@layouts/VerticalLayout'
import Navigation from '@components/layout/vertical/Navigation'
import Navbar from '@components/layout/vertical/Navbar'
import Footer from '@components/layout/vertical/Footer'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <VerticalLayout
      navigation={<Navigation mode='light' />}
      navbar={<Navbar />}
      footer={<Footer />}
    >
      <Box className='p-6'>{children}</Box>
    </VerticalLayout>
  )
}
