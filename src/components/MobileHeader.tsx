import { Link } from 'react-router-dom'
import { useNotificationCount } from '../hooks/useNotificationCount'
import styles from './MobileHeader.module.css'

export function MobileHeader() {
  const notificationCount = useNotificationCount()

  return (
    <header className={styles.mobileHeader}>
      <Link to="/" className={styles.logo}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          <circle cx="15" cy="8" r="2.5" fill="currentColor" />
        </svg>
        <span>夜棂</span>
      </Link>

      <Link to="/notifications" className={styles.notificationBell} aria-label="通知">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {notificationCount > 0 && (
          <span className={styles.badge}>{notificationCount > 99 ? '99+' : notificationCount}</span>
        )}
      </Link>
    </header>
  )
}
