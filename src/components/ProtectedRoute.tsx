import { Navigate, useLocation } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { hasValidToken } from '../utils/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user } = useDreamStore()
  const location = useLocation()

  if (!user || !hasValidToken()) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
