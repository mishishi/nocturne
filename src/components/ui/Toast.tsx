import { useEffect } from 'react'
import styles from './Toast.module.css'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastProps {
  message: string
  visible: boolean
  onClose: () => void
  duration?: number
  type?: 'success' | 'error' | 'info'
  action?: ToastAction
}

export function Toast({ message, visible, onClose, duration, type = 'success', action }: ToastProps) {
  const defaultDuration = type === 'error' ? 3500 : type === 'info' ? 5000 : 2000
  const effectiveDuration = duration ?? defaultDuration

  useEffect(() => {
    if (visible && !action) {
      const timer = setTimeout(onClose, effectiveDuration)
      return () => clearTimeout(timer)
    }
  }, [visible, effectiveDuration, onClose, action])

  if (!visible) return null

  return (
    <div className={`${styles.toast} ${type === 'error' ? styles.error : ''} ${type === 'info' ? styles.info : ''}`} role="alert" aria-live="assertive">
      {type === 'error' ? (
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ) : type === 'info' ? (
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ) : (
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )}
      <span>{message}</span>
      {action && (
        <button className={styles.actionBtn} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
