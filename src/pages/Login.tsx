import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { authApi, api } from '../services/api'
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

  // Check if user is already logged in
  useEffect(() => {
    const { user, token } = useDreamStore.getState()
    if (user && token) {
      navigate('/')
    }
  }, [navigate])

  // Get redirect destination from state
  const from = (location.state as { from?: Location })?.from?.pathname || '/'

  const handleWeChatLogin = async () => {
    setIsLoading(true)
    setError('')

    // Simulate WeChat OAuth - in production, this would redirect to WeChat OAuth
    // For demo, we generate a mock openid based on timestamp
    const mockOpenid = `wx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      const result = await authApi.wechatLogin(mockOpenid)
      if (result.success) {
        // Store token first so migrateSession can use it
        if (result.token) {
          localStorage.setItem('yeelin_token', result.token)
        }

        // Migrate guest sessions if exists
        const guestOpenid = localStorage.getItem('yeelin_openid')
        if (guestOpenid && guestOpenid !== result.user.openid) {
          await api.migrateSession(guestOpenid, result.user.openid)
        }

        setUser(result.user, result.token)
        localStorage.setItem('yeelin_openid', result.user.openid)
        navigate(from, { replace: true })
      } else {
        setError('微信登录失败，请重试')
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
      if (result.success && result.user) {
        // Store token first so migrateSession can use it
        if (result.token) {
          localStorage.setItem('yeelin_token', result.token)
        }

        // Migrate guest sessions if exists
        const guestOpenid = localStorage.getItem('yeelin_openid')
        if (guestOpenid && guestOpenid !== result.user.openid) {
          await api.migrateSession(guestOpenid, result.user.openid)
        }

        setUser(result.user, result.token)
        localStorage.setItem('yeelin_openid', result.user.openid)
        navigate(from, { replace: true })
      } else {
        setError(result.reason || '登录失败')
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
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`
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
                onClick={() => setShowPhoneLogin(true)}
              >
                使用手机号登录
              </button>

              <p className={styles.loginHint}>
                登录即表示同意
                <a href="#" className={styles.link}>《用户协议》</a>
                和
                <a href="#" className={styles.link}>《隐私政策》</a>
              </p>
            </div>
          ) : (
            // Phone Login Mode
            <div className={styles.phoneMode}>
              <button
                className={styles.backButton}
                onClick={() => {
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
                  <a href="#" className={styles.link}>忘记密码？</a>
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
    </div>
  )
}
