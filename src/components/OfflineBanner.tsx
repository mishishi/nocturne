import { usePWA } from '../hooks/usePWA'
import styles from './OfflineBanner.module.css'

export function OfflineBanner() {
  const { isOnline } = usePWA()

  // Don't show when online
  if (isOnline) {
    return null
  }

  return (
    <div className={styles.banner} role="alert" aria-live="polite">
      <div className={styles.content}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <span className={styles.text}>当前处于离线状态</span>
      </div>
      <span className={styles.hint}>检查网络连接后重试</span>
    </div>
  )
}
