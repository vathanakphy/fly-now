import type { ReactNode } from 'react'
import { AuthProvider } from '../../features/auth/AuthProvider'
import { ToastProvider } from '../../components/ui'

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    <ToastProvider>{children}</ToastProvider>
  </AuthProvider>
)
