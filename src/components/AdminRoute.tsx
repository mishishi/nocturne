import { Navigate, useLocation } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useDreamStore()
  const location = useLocation()

  if (!user?.isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return <>{children}</>
}
