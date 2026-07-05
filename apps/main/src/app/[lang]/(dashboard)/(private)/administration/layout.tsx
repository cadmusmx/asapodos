// Type Imports
import type { ReactNode } from 'react'

// HOC Imports
import ModuleAccessGuard from '@/hocs/ModuleAccessGuard'

const AdministrationLayout = ({ children }: { children: ReactNode }) => {
  return <ModuleAccessGuard moduleKey='administration'>{children}</ModuleAccessGuard>
}

export default AdministrationLayout
