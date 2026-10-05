import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { useAuth } from '../features/auth/AuthProvider'

const RestoringSession = () => (
  <main className="flex min-h-screen items-center justify-center" aria-label="Restoring session">
    <Spinner size="lg" label="Restoring session" />
  </main>
)

export const ProtectedRoute = () => {
  const { user, isRestoring } = useAuth()
  const location = useLocation()
  if (isRestoring) return <RestoringSession />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

export const PublicOnlyRoute = () => {
  const { user, isRestoring } = useAuth()
  const location = useLocation()
  if (isRestoring) return <RestoringSession />
  if (user) {
    const state = location.state as { from?: Location } | null
    return <Navigate to={state?.from ?? '/applications'} replace />
  }
  return <Outlet />
}
