import { useState, useEffect, useRef } from 'react'
import { Button } from './ui/Button'
import styles from './CookieConsent.module.css'

const COOKIE_CONSENT_KEY = 'yeelin_cookie_consent'

interface CookieConsentState {
  necessary: boolean      // Always true - auth cookies etc
  analytics: boolean      // Umami analytics
 客服: boolean          // Crisp chat
}

const STORAGE_KEY = 'yeelin_cookie_preferences'

/**
 * 获取存储的 Cookie 偏好
 */
export function getCookiePreferences(): CookieConsentState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

/**
 * 保存 Cookie 偏好
 */
function saveCookiePreferences(prefs: CookieConsentState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  localStorage.setItem(COOKIE_CONSENT_KEY, 'true')
}

/**
 * 检查是否已显示过同意弹窗
 */
export function hasCookieConsent(): boolean {
  return localStorage.getItem(COOKIE_CONSENT_KEY) === 'true'
}

interface CookieConsentProps {
  onConsentChange?: (prefs: CookieConsentState) => void
}

/**
 * Cookie 同意弹窗组件
 * 符合 GDPR 和中国《个人信息保护法》要求
 */
export function CookieConsent({ onConsentChange }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [prefs, setPrefs] = useState<CookieConsentState>({
    necessary: true,
    analytics: false,
    客服: false
  })

  // Use ref to avoid infinite loop from onConsentChange being a new function each render
  const onConsentChangeRef = useRef(onConsentChange)
  onConsentChangeRef.current = onConsentChange

  // Handle Escape key to close dialog (decline all)
  useEffect(() => {
    if (!isVisible) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const newPrefs: CookieConsentState = {
          necessary: true,
          analytics: false,
          客服: false
        }
        saveCookiePreferences(newPrefs)
        setPrefs(newPrefs)
        setIsVisible(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible])

  useEffect(() => {
    // 只在首次访问时显示
    if (hasCookieConsent()) {
      const savedPrefs = getCookiePreferences()
      if (savedPrefs) {
        setPrefs(savedPrefs)
        onConsentChangeRef.current?.(savedPrefs)
      }
      return
    }
    setIsVisible(true)
  }, []) // Empty deps - only run once on mount

  const handleAcceptAll = () => {
    const newPrefs: CookieConsentState = {
      necessary: true,
      analytics: true,
      客服: true
    }
    saveCookiePreferences(newPrefs)
    setPrefs(newPrefs)
    setIsVisible(false)
    onConsentChange?.(newPrefs)
  }

  const handleDeclineAll = () => {
    const newPrefs: CookieConsentState = {
      necessary: true,
      analytics: false,
      客服: false
    }
    saveCookiePreferences(newPrefs)
    setPrefs(newPrefs)
    setIsVisible(false)
    onConsentChange?.(newPrefs)
  }

  const handleSavePreferences = () => {
    saveCookiePreferences(prefs)
    setIsVisible(false)
    onConsentChange?.(prefs)
  }

  const toggleAnalytics = () => {
    setPrefs(prev => ({ ...prev, analytics: !prev.analytics }))
  }

  const toggleSupport = () => {
    setPrefs(prev => ({ ...prev, 客服: !prev.客服 }))
  }

  if (!isVisible) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="cookie-title">
      <div className={styles.banner}>
        <div className={styles.content}>
          <h2 id="cookie-title" className={styles.title}>Cookie 偏好设置</h2>
          <p className={styles.description}>
            我们使用 Cookie 来提供和改善我们的服务。您可以选择接受或拒绝非必要的 Cookie。
            必要的 Cookie 无法关闭，因为它们是服务正常运行所必需的。
          </p>

          <div className={styles.cookieList}>
            <div className={styles.cookieItem}>
              <div className={styles.cookieInfo}>
                <span className={styles.cookieName}>必要 Cookie</span>
                <span className={styles.cookieDesc}>用于身份验证和安全功能，无法关闭</span>
              </div>
              <span className={styles.cookieStatus} aria-disabled="true">必需</span>
            </div>

            <div className={styles.cookieItem}>
              <div className={styles.cookieInfo}>
                <span className={styles.cookieName}>分析 Cookie</span>
                <span className={styles.cookieDesc}>帮助我们了解用户如何使用我们的服务（可选）</span>
              </div>
              <button
                className={`${styles.toggle} ${prefs.analytics ? styles.toggleOn : ''}`}
                onClick={toggleAnalytics}
                role="switch"
                aria-checked={prefs.analytics}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>

            <div className={styles.cookieItem}>
              <div className={styles.cookieInfo}>
                <span className={styles.cookieName}>客服支持</span>
                <span className={styles.cookieDesc}>启用在线客服功能（可选）</span>
              </div>
              <button
                className={`${styles.toggle} ${prefs.客服 ? styles.toggleOn : ''}`}
                onClick={toggleSupport}
                role="switch"
                aria-checked={prefs.客服}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={handleDeclineAll}>
            全部拒绝
          </Button>
          <div className={styles.primaryActions}>
            <Button variant="secondary" size="sm" onClick={handleSavePreferences}>
              保存偏好
            </Button>
            <Button variant="primary" size="sm" onClick={handleAcceptAll}>
              全部接受
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
