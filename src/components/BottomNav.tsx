import { Link, useLocation } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import styles from './BottomNav.module.css'

const NAV_ITEMS = [
  {
    path: '/',
    label: '首页',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  },
  {
    path: '/wall',
    label: '梦墙',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a7 7 0 0 1 0 14 7 7 0 0 1 0-14" />
        <circle cx="12" cy="9" r="3" />
      </svg>
    )
  },
  {
    path: '/history',
    label: '历史',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
  },
  {
    path: '/profile',
    label: '我的',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  }
]

export function BottomNav() {
  const location = useLocation()
  const { achievements } = useDreamStore()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className={styles.nav} aria-label="底部导航">
      <div className={styles.tabList} role="tablist">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`${styles.tab} ${isActive(item.path) ? styles.active : ''}`}
            role="tab"
            aria-current={isActive(item.path) ? 'page' : undefined}
            aria-label={item.label}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
            {item.path === '/profile' && achievements.length > 0 && (
              <span className={styles.badge} aria-label={`${achievements.length}个已解锁成就`}>
                {achievements.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Floating Action Button for recording */}
      <Link to="/dream?new=1" className={styles.fab} aria-label="记录梦境">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>
    </nav>
  )
}
