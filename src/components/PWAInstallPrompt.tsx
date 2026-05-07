import { useState } from 'react'
import { usePWA } from '../hooks/usePWA'
import styles from './PWAInstallPrompt.module.css'

interface PWAInstallPromptProps {
  onInstalled?: () => void
}

export function PWAInstallPrompt({ onInstalled }: PWAInstallPromptProps) {
  const { installAvailable, installApp, dismissInstallPrompt, isStandalone } = usePWA()
  const [isInstalling, setIsInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Don't show if already installed, no install available, or dismissed
  if (isStandalone || !installAvailable || dismissed) {
    return null
  }

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const success = await installApp()
      if (success) {
        onInstalled?.()
      }
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    dismissInstallPrompt()
  }

  return (
    <div className={styles.banner} role="complementary" aria-label="安装应用">
      <div className={styles.content}>
        <div className={styles.icon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className={styles.text}>
          <span className={styles.title}>安装夜棂到桌面</span>
          <span className={styles.description}>获得更流畅的体验和离线访问</span>
        </div>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.installBtn}
          onClick={handleInstall}
          disabled={isInstalling}
        >
          {isInstalling ? (
            <span className={styles.spinner} />
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              安装
            </>
          )}
        </button>
        <button
          className={styles.dismissBtn}
          onClick={handleDismiss}
          aria-label="关闭"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
