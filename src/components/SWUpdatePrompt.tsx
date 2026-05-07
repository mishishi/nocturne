import { useState } from 'react'
import { usePWA } from '../hooks/usePWA'
import styles from './SWUpdatePrompt.module.css'

export function SWUpdatePrompt() {
  const { needsUpdate, applyUpdate } = usePWA()
  const [isUpdating, setIsUpdating] = useState(false)

  if (!needsUpdate) {
    return null
  }

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      await applyUpdate()
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={styles.banner} role="alert" aria-live="polite">
      <div className={styles.content}>
        <div className={styles.icon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className={styles.text}>
          <span className={styles.title}>有新版本可用</span>
          <span className={styles.description}>更新以获得最新功能和修复</span>
        </div>
      </div>
      <button
        className={styles.updateBtn}
        onClick={handleUpdate}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <>
            <span className={styles.spinner} />
            更新中...
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            更新
          </>
        )}
      </button>
    </div>
  )
}
