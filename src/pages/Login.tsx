import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { authApi, api } from '../services/api'
import { openidService } from '../services/openidService'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { showToast } from '../hooks/useDreamStore'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { setRefreshToken } from '../utils/auth'
import styles from './Login.module.css'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useDreamStore()
  const [isLoading, setIsLoading] = useState(false)
  const [loginMode, setLoginMode] = useState<'wechat' | 'email' | 'phone'>('email')

  // Form states
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({ email: false, phone: false, password: false })

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    message: string
    onConfirm: () => void
  }>({ open: false, message: '', onConfirm: () => {} })

  // Real-time validation
  const validateField = (field: 'email' | 'phone' | 'password', value: string): string => {
    if (field === 'email') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return '请输入有效的邮箱地址'
      }
    }
    if (field === 'phone') {
      if (value && !/^1[3-9]\d{9}$/.test(value)) {
        return '请输入有效的手机号'
      }
    }
    if (field === 'password') {
      if (value && value.length < 6) {
        return '密码至少6位'
      }
    }
    return ''
  }

  const getFieldError = (field: 'email' | 'phone' | 'password'): string => {
    const value = field === 'email' ? email : field === 'phone' ? phone : password
    return touched[field] ? validateField(field, value) : ''
  }

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!email || !password) {
      setError('请输入邮箱和密码')
      setIsLoading(false)
      return
    }

    try {
      const result = await authApi.emailLogin(email, password)
      if (result.success && result.data?.user) {
        const user = result.data.user
        const token = result.data.token
        const refreshToken = result.data.refreshToken
        // Store refresh token for token refresh
        if (refreshToken) {
          setRefreshToken(refreshToken)
        }
        // Token is stored via setUser (useDreamStore) which handles Cookie persistence
        // Server also sets httpOnly Cookie via Set-Cookie header

        // Migrate guest sessions if exists
        const guestOpenid = openidService.get()
        if (guestOpenid && guestOpenid !== user.openid) {
          try {
            const result = await api.migrateSession(guestOpenid)
            if (result.success && (result.data?.migrated ?? 0) > 0) {
              showToast(`已保留 ${result.data?.migrated} 个未完成的梦境`)
            }
          } catch (err) {
            console.error('Session migration failed:', err)
            showToast('无法保留草稿，但您仍可正常登录', 'error')
          }
        }

        setUser(user, token, guestOpenid ?? undefined)
        openidService.set(user.openid)
        // Respect 'from' if user came from a specific page, otherwise use role-based default
        const destination = from !== '/' ? from : (user.isAdmin ? '/admin' : '/')
        navigate(destination, { replace: true })
      } else {
        setError((!result.success ? result.error?.message : result.message) || '登录失败')
      }
    } catch (err) {
      setError('网络错误，请检查网络连接')
    } finally {
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
        const refreshToken = result.data.refreshToken
        // Store refresh token for token refresh
        if (refreshToken) {
          setRefreshToken(refreshToken)
        }

        // Migrate guest sessions if exists
        const guestOpenid = openidService.get()
        if (guestOpenid && guestOpenid !== user.openid) {
          try {
            const result = await api.migrateSession(guestOpenid)
            if (result.success && (result.data?.migrated ?? 0) > 0) {
              showToast(`已保留 ${result.data?.migrated} 个未完成的梦境`)
            }
          } catch (err) {
            console.error('Session migration failed:', err)
            showToast('无法保留草稿，但您仍可正常登录', 'error')
          }
        }

        setUser(user, token, guestOpenid ?? undefined)
        openidService.set(user.openid)
        const destination = from !== '/' ? from : (user.isAdmin ? '/admin' : '/')
        navigate(destination, { replace: true })
      } else {
        setError((!result.success ? result.error?.message : result.message) || '登录失败')
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
          {loginMode === 'wechat' && (
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
                  if (email || password) {
                    setConfirmModal({
                      open: true,
                      message: '切换登录方式将清空已填写的信息，确定继续吗？',
                      onConfirm: () => {
                        setEmail('')
                        setPassword('')
                        setLoginMode('email')
                        setConfirmModal(prev => ({ ...prev, open: false }))
                      }
                    })
                    return
                  }
                  setLoginMode('email')
                }}
              >
                使用邮箱登录
              </button>

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
                        setLoginMode('phone')
                        setConfirmModal(prev => ({ ...prev, open: false }))
                      }
                    })
                    return
                  }
                  setLoginMode('phone')
                }}
              >
                使用手机号登录
              </button>

              <a href="/account-recovery" className={styles.phoneToggle}>
                登录遇到问题？
              </a>

              <p className={styles.loginHint}>
                登录即表示同意
                <span className={styles.link}>《用户协议》</span>
                和
                <span className={styles.link}>《隐私政策》</span>
              </p>

              {/* Trust Badges */}
              <div className={styles.trustBadges}>
                <div className={styles.trustBadge}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>数据加密</span>
                </div>
                <div className={styles.trustBadge}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>隐私保护</span>
                </div>
              </div>
            </div>
          )}

          {loginMode === 'email' && (
            // Email Login Mode
            <div className={styles.phoneMode}>
              <button
                className={styles.backButton}
                onClick={() => {
                  if (email || password) {
                    setConfirmModal({
                      open: true,
                      message: '切换登录方式将清空已填写的信息，确定继续吗？',
                      onConfirm: () => {
                        setEmail('')
                        setPassword('')
                        setLoginMode('wechat')
                        setError('')
                        setConfirmModal(prev => ({ ...prev, open: false }))
                      }
                    })
                    return
                  }
                  setLoginMode('wechat')
                  setError('')
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                返回微信登录
              </button>

              <form onSubmit={handleEmailLogin} className={styles.phoneForm}>
                <div className={styles.inputGroup}>
                  <div className={styles.inputWrapper}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <input
                      type="email"
                      placeholder="邮箱"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                      className={`${styles.input} ${getFieldError('email') ? styles.inputError : ''}`}
                      autoComplete="email"
                      aria-describedby={getFieldError('email') ? 'email-error' : undefined}
                      aria-invalid={getFieldError('email') ? 'true' : undefined}
                    />
                    {getFieldError('email') && (
                      <span id="email-error" className={styles.fieldError} role="alert">{getFieldError('email')}</span>
                    )}
                  </div>

                  <div className={styles.inputWrapper}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                      className={`${styles.input} ${getFieldError('password') ? styles.inputError : ''}`}
                      autoComplete="current-password"
                      aria-describedby={getFieldError('password') ? 'password-error' : undefined}
                      aria-invalid={getFieldError('password') ? 'true' : undefined}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                    {getFieldError('password') && (
                      <span id="password-error" className={styles.fieldError} role="alert">{getFieldError('password')}</span>
                    )}
                  </div>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <LoadingSpinner />
                  ) : (
                    '立即开始探索'
                  )}
                </button>

                <div className={styles.formFooter}>
                  <Link to="/forgot-password" className={styles.link}>忘记密码？</Link>
                  <span className={styles.separator}>|</span>
                  <Link to="/register" className={styles.link}>注册账号</Link>
                </div>

                {/* Trust Badges */}
                <div className={styles.trustBadges}>
                  <div className={styles.trustBadge}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span>数据加密</span>
                  </div>
                  <div className={styles.trustBadge}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>隐私保护</span>
                  </div>
                </div>
              </form>
            </div>
          )}
          {loginMode === 'phone' && (
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
                        setLoginMode('wechat')
                        setError('')
                        setConfirmModal(prev => ({ ...prev, open: false }))
                      }
                    })
                    return
                  }
                  setLoginMode('wechat')
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
                      onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                      className={`${styles.input} ${getFieldError('phone') ? styles.inputError : ''}`}
                      autoComplete="tel"
                      aria-describedby={getFieldError('phone') ? 'phone-error' : undefined}
                      aria-invalid={getFieldError('phone') ? 'true' : undefined}
                    />
                    {getFieldError('phone') && (
                      <span id="phone-error" className={styles.fieldError} role="alert">{getFieldError('phone')}</span>
                    )}
                  </div>

                  <div className={styles.inputWrapper}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                      className={`${styles.input} ${getFieldError('password') ? styles.inputError : ''}`}
                      autoComplete="current-password"
                      aria-describedby={getFieldError('password') ? 'password-error' : undefined}
                      aria-invalid={getFieldError('password') ? 'true' : undefined}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                    {getFieldError('password') && (
                      <span id="password-error" className={styles.fieldError} role="alert">{getFieldError('password')}</span>
                    )}
                  </div>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <LoadingSpinner />
                  ) : (
                    '立即开始探索'
                  )}
                </button>

                <div className={styles.formFooter}>
                  <Link to="/forgot-password" className={styles.link}>忘记密码？</Link>
                  <span className={styles.separator}>|</span>
                  <Link to="/register" className={styles.link}>注册账号</Link>
                </div>

                {/* Trust Badges */}
                <div className={styles.trustBadges}>
                  <div className={styles.trustBadge}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span>数据加密</span>
                  </div>
                  <div className={styles.trustBadge}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>隐私保护</span>
                  </div>
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

    </div>
  )
}
