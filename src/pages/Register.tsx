import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { authApi, api } from '../services/api'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import styles from './Register.module.css'

export function Register() {
  const navigate = useNavigate()
  const { setUser } = useDreamStore()
  const [step, setStep] = useState<'credentials' | 'nickname'>('credentials')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    message: string
    onConfirm: () => void
  }>({ open: false, message: '', onConfirm: () => {} })

  // Form data
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!phone || !password || !confirmPassword) {
      setError('请填写所有必填项')
      return
    }

    if (phone.length !== 11) {
      setError('请输入正确的手机号')
      return
    }

    if (password.length < 6) {
      setError('密码至少6位')
      return
    }

    if (password !== confirmPassword) {
      setError('两次密码不一致')
      return
    }

    if (!agreedToTerms) {
      setError('请先同意用户协议和隐私政策')
      return
    }

    setStep('nickname')
  }

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await authApi.register(phone, password, nickname || undefined)

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
          await api.migrateSession(guestOpenid)
        }

        // If there's an invite code, use it
        if (inviteCode) {
          try {
            await authApi.verifyToken(token!)
            // Use invite code - invite functionality would be called here
          } catch {
            // Ignore invite errors
          }
        }

        setUser(user, token, guestOpenid)
        localStorage.setItem('yeelin_openid', user.openid)
        navigate('/')
      } else {
        setError(result.message || '注册失败')
        setStep('credentials')
      }
    } catch (err) {
      setError('网络错误，请检查网络连接')
      setStep('credentials')
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
          {/* Step Indicator */}
          <div className={styles.stepIndicator}>
            <div className={`${styles.step} ${step === 'credentials' ? styles.stepActive : styles.stepDone}`}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepLabel}>验证手机</span>
            </div>
            <div className={styles.stepLine} />
            <div className={`${styles.step} ${step === 'nickname' ? styles.stepActive : ''}`}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepLabel}>设置昵称</span>
            </div>
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <div className={styles.inputWrapper}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <input
                    type="tel"
                    placeholder="手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className={styles.input}
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
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    <circle cx="12" cy="16" r="1"/>
                  </svg>
                  <input
                    type="password"
                    placeholder="确认密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                    autoComplete="new-password"
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

              <button type="submit" className={styles.submitButton} disabled={!agreedToTerms}>
                继续
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.arrowIcon}>
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>

              <p className={styles.loginLink}>
                已有账号？<a href="/login" className={styles.link}>立即登录</a>
              </p>
            </form>
          ) : (
            <form onSubmit={handleNicknameSubmit} className={styles.form}>
              <div className={styles.avatarSection}>
                <div className={styles.avatarPreview}>
                  <div className={styles.avatarInner}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                </div>
                <p className={styles.avatarHint}>选择你喜欢的昵称作为你在梦境世界的代号</p>
              </div>

              <div className={styles.inputGroup}>
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

                <div className={styles.inputWrapper}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                    <path d="M20 12v10H4V12"/>
                    <path d="M2 7h20v5H2z"/>
                    <path d="M12 22V7"/>
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="邀请码（选填）"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 8))}
                    className={styles.input}
                  />
                </div>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.submitButton} disabled={isLoading}>
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    进入夜棂
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.arrowIcon}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>

              <button
                type="button"
                className={styles.backButton}
                onClick={() => {
                  setConfirmModal({
                    open: true,
                    message: '返回将丢失已填写的信息，确定要返回吗？',
                    onConfirm: () => {
                      setStep('credentials')
                      setError('')
                      setConfirmModal(prev => ({ ...prev, open: false }))
                    }
                  })
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                返回修改
              </button>

              <p className={styles.terms}>
                注册即表示同意
                <span className={styles.link}>《用户协议》</span>
                和
                <span className={styles.link}>《隐私政策》</span>
              </p>
            </form>
          )}
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

      <ConfirmModal
        isOpen={confirmModal.open}
        title="确认返回"
        message={confirmModal.message}
        confirmText="确定返回"
        cancelText="取消"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  )
}
