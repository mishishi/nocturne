import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { authApi, api } from '../services/api'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Toast } from '../components/ui/Toast'
import styles from './Login.module.css'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useDreamStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showPhoneLogin, setShowPhoneLogin] = useState(false)
  const [_loginMode, _setLoginMode] = useState<'wechat' | 'phone'>('wechat')

  // Form states
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    message: string
    onConfirm: () => void
  }>({ open: false, message: '', onConfirm: () => {} })

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  // Generate star positions once, not on each render
  const stars = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 4}s`,
      animationDuration: `${2 + Math.random() * 3}s`,
      width: `${1 + Math.random() * 2}px`,
      height: `${1 + Math.random() * 2}px`,
      key: i
    })), []
  )

  // Check if user is already logged in
  useEffect(() => {
    const { user, token } = useDreamStore.getState()
    if (user && token) {
      navigate(user.isAdmin ? '/admin' : '/')
    }
  }, [navigate])

  // Get redirect destination from state
  const from = (location.state as { from?: Location })?.from?.pathname || '/'

  const handleWeChatLogin = async () => {
    setIsLoading(true)
    setError('')

    try {
      // 跳转到后端授权接口，后端会重定向到微信授权页面
      const callbackUrl = `${window.location.origin}/auth/wechat/callback`
      const authorizeUrl = `/api/auth/wechat/authorize?redirect_uri=${encodeURIComponent(callbackUrl)}`

      // 跳转到后端生成授权链接
      window.location.href = authorizeUrl
    } catch (err) {
      setError('网络错误，请检查网络连接')
      setIsLoading(false)
    }
  }

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!phone || !password) {
      setError('请输入手机号和密码')
      setIsLoading(false)
      return
    }

    try {
      const result = await authApi.phoneLogin(phone, password)
      if (result.success && result.data?.user) {
        const user = result.data.user
        const token = result.data.token
        // Store token first so migrateSession can use it
        if (token) {
          localStorage.setItem('yeelin_token', token)
        }

        // Migrate guest sessions if exists
        const guestOpenid = localStorage.getItem('yeelin_openid')
        if (guestOpenid && guestOpenid !== user.openid) {
          try {
            const result = await api.migrateSession(guestOpenid)
            if (result.success && result.migrated > 0) {
              showToast('检测到您有未完成的梦境，已为您保留')
              // Clear guest localStorage data after successful merge
              localStorage.removeItem('yeelin_guest_openid')
            }
          } catch (err) {
            console.error('Session migration failed:', err)
          }
        }

        setUser(user, token)
        localStorage.setItem('yeelin_openid', user.openid)
        navigate(user.isAdmin ? '/admin' : from, { replace: true })
      } else {
        setError(result.data?.reason || result.reason || '登录失败')
      }
    } catch (err) {
      setError('网络错误，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Animated star field background */}
      <div className={styles.starfield}>
        {stars.map((star) => (
          <div
            key={star.key}
            className={styles.star}
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.animationDelay,
              animationDuration: star.animationDuration,
              width: star.width,
              height: star.height
            }}
          />
        ))}
      </div>

      {/* Nebula glow effect */}
      <div className={styles.nebula} />
      <div className={styles.nebulaSecondary} />

      {/* Central portal */}
      <div className={styles.portalContainer}>
        <div className={styles.portalRing} />
        <div className={styles.portalRingSecondary} />
        <div className={styles.portalCore}>
          <svg viewBox="0 0 100 100" className={styles.portalIcon}>
            <defs>
              <radialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFD666" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#F4D35E" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#F4D35E" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#portalGlow)" />
            <path
              d="M50 15 L55 35 L75 35 L60 48 L67 70 L50 55 L33 70 L40 48 L25 35 L45 35 Z"
              fill="#F4D35E"
              opacity="0.9"
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Logo & Title */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleMain}>夜棂</span>
            <span className={styles.titleSub}>Yeelin</span>
          </h1>
          <p className={styles.tagline}>穿越梦境的星门，开启你的灵魂之旅</p>
        </div>

        {/* Login Card */}
        <div className={styles.card}>
          {!showPhoneLogin ? (
            // WeChat Login Mode
            <div className={styles.wechatMode}>
              <button
                className={styles.wechatButton}
                onClick={handleWeChatLogin}
                disabled={isLoading}
              >
                <div className={styles.wechatIcon}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.69 13.3c-.39-.39-.39-1.02 0-1.41l6.25-6.25c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41L10.1 13.3a.996.996 0 0 1-1.41 0z"/>
                    <path d="M15.31 21.7c-.39-.39-.39-1.02 0-1.41l6.25-6.25c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41L16.72 21.7a.996.996 0 0 1-1.41 0z"/>
                    <path d="M17.56 17.56c-.39-.39-.39-1.02 0-1.41l.71-.71c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41l-.71.71c-.39.39-1.02.39-1.41 0z"/>
                  </svg>
                </div>
                <span className={styles.wechatText}>
                  {isLoading ? '正在连接...' : '微信登录'}
                </span>
              </button>

              <div className={styles.divider}>
                <span>或</span>
              </div>

              <button
                className={styles.phoneToggle}
                onClick={() => {
                  if (phone || password) {
                    setConfirmModal({
                      open: true,
                      message: '切换登录方式将清空已填写的信息，确定继续吗？',
                      onConfirm: () => {
                        setPhone('')
                        setPassword('')
                        setShowPhoneLogin(true)
                        setConfirmModal(prev => ({ ...prev, open: false }))
                      }
                    })
                    return
                  }
                  setShowPhoneLogin(true)
                }}
              >
                使用手机号登录
              </button>

              <p className={styles.loginHint}>
                登录即表示同意
                <span className={styles.link}>《用户协议》</span>
                和
                <span className={styles.link}>《隐私政策》</span>
              </p>
            </div>
          ) : (
            // Phone Login Mode
            <div className={styles.phoneMode}>
              <button
                className={styles.backButton}
                onClick={() => {
                  if (phone || password) {
                    setConfirmModal({
                      open: true,
                      message: '切换登录方式将清空已填写的信息，确定继续吗？',
                      onConfirm: () => {
                        setPhone('')
                        setPassword('')
                        setShowPhoneLogin(false)
                        setError('')
                        setConfirmModal(prev => ({ ...prev, open: false }))
                      }
                    })
                    return
                  }
                  setShowPhoneLogin(false)
                  setError('')
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                返回微信登录
              </button>

              <form onSubmit={handlePhoneLogin} className={styles.phoneForm}>
                <div className={styles.inputGroup}>
                  <div className={styles.inputWrapper}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <input
                      type="tel"
                      placeholder="手机号"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={styles.input}
                      maxLength={11}
                      autoComplete="tel"
                    />
                  </div>

                  <div className={styles.inputWrapper}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      type="password"
                      placeholder="密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.input}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className={styles.loadingSpinner} />
                  ) : (
                    '进入夜棂'
                  )}
                </button>

                <div className={styles.formFooter}>
                  <span className={styles.link}>忘记密码？</span>
                  <span className={styles.separator}>|</span>
                  <a href="/register" className={styles.link}>注册账号</a>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Floating celestial elements */}
      <div className={styles.celestialRing} />
      <div className={styles.moonGlow} />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title="确认"
        message={confirmModal.message}
        confirmText="确定"
        cancelText="取消"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}
