import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { authApi, api } from '../services/api'
import { openidService } from '../services/openidService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { setAuthToken, setRefreshToken } from '../utils/auth'
import styles from './Register.module.css'

export function Register() {
  const navigate = useNavigate()
  const { setUser } = useDreamStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Single-step registration - all fields on one page
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!email || !password) {
      setError('请填写邮箱和密码')
      setIsLoading(false)
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('密码至少6位')
      setIsLoading(false)
      return
    }

    if (!agreedToTerms) {
      setError('请先同意用户协议和隐私政策')
      setIsLoading(false)
      return
    }

    try {
      const result = await authApi.emailRegister(email, password, nickname || undefined)

      if (result.success && result.data?.user) {
        const user = result.data.user
        const token = result.data.token
        const refreshToken = result.data.refreshToken
        if (token) {
          setAuthToken(token)
        }
        if (refreshToken) {
          setRefreshToken(refreshToken)
        }

        const guestOpenid = openidService.get()
        if (guestOpenid && guestOpenid !== user.openid) {
          await api.migrateSession(guestOpenid)
        }

        setUser(user, token, guestOpenid ?? undefined)
        openidService.set(user.openid)
        navigate('/')
      } else {
        setError((!result.success ? result.error?.message : result.message) || '注册失败')
      }
    } catch (err) {
      setError('网络错误，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Background effects */}
      <div className={styles.starfield}>
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`
            }}
          />
        ))}
      </div>

      <div className={styles.glow} />
      <div className={styles.glowSecondary} />

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleMain}>创建你的梦境</span>
            <span className={styles.titleSub}>开启灵魂探索之旅</span>
          </h1>
        </div>

        <div className={styles.card}>
          {/* Single-step form */}
          <form onSubmit={handleSubmit} className={styles.form}>
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
                  className={styles.input}
                  autoComplete="email"
                />
              </div>

              <div className={styles.inputWrapper}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type="password"
                  placeholder="密码（至少6位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  autoComplete="new-password"
                />
              </div>

              <div className={styles.passwordHints} aria-live="polite">
                <span className={`${styles.hint} ${password.length >= 6 ? styles.hintOk : ''}`}>
                  {password.length >= 6 ? '✓' : '○'} 至少6位
                </span>
                <span className={`${styles.hint} ${/\d/.test(password) ? styles.hintOk : ''}`}>
                  {/\d/.test(password) ? '✓' : '○'} 含数字
                </span>
                <span className={`${styles.hint} ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? styles.hintOk : ''}`}>
                  {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✓' : '○'} 含特殊字符
                </span>
              </div>

              <div className={styles.inputWrapper}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  type="text"
                  placeholder="给自己起个昵称（选填）"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                  className={styles.input}
                  maxLength={20}
                />
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <label className={styles.termsCheckbox} htmlFor="terms-checkbox">
              <input
                id="terms-checkbox"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxLabel}>
                我已阅读并同意
                <span className={styles.link}>《用户协议》</span>
                和
                <span className={styles.link}>《隐私政策》</span>
              </span>
            </label>

            <button type="submit" className={styles.submitButton} disabled={isLoading || !agreedToTerms}>
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  立即开始探索
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.arrowIcon}>
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>

            <p className={styles.loginLink}>
              已有账号？<Link to="/login" className={styles.link}>立即登录</Link>
            </p>
          </form>
        </div>
      </div>

      {/* Decorative elements */}
      <div className={styles.decorLeft}>
        <svg viewBox="0 0 60 120" fill="none">
          <circle cx="30" cy="30" r="2" fill="currentColor" opacity="0.3"/>
          <circle cx="30" cy="60" r="3" fill="currentColor" opacity="0.5"/>
          <circle cx="30" cy="90" r="2" fill="currentColor" opacity="0.3"/>
          <path d="M30 0 L30 120" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.2"/>
        </svg>
      </div>
      <div className={styles.decorRight}>
        <svg viewBox="0 0 60 120" fill="none">
          <circle cx="30" cy="30" r="2" fill="currentColor" opacity="0.3"/>
          <circle cx="30" cy="60" r="3" fill="currentColor" opacity="0.5"/>
          <circle cx="30" cy="90" r="2" fill="currentColor" opacity="0.3"/>
          <path d="M30 0 L30 120" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.2"/>
        </svg>
      </div>
    </div>
  )
}
