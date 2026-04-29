import { Navigate, useLocation } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

// Check if token exists in localStorage
const hasValidToken = () => !!localStorage.getItem('yeelin_token')

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user } = useDreamStore()
  const location = useLocation()

  if (!user || !hasValidToken()) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
