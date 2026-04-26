import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div key={location.pathname} style={{ minHeight: '100vh' }}>
      {children}
    </div>
  )
}
