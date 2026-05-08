import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import styles from './AccountRecovery.module.css'

type RecoveryMode = 'phone' | 'email'
type Step = 'account' | 'verify' | 'password'

export function AccountRecovery() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<RecoveryMode>('phone')
  const [step, setStep] = useState<Step>('account')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    message: '',
    onConfirm: () => {}
  })

  // Form data
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [countdown, setCountdown] = useState(0)

  const handleSendCode = async () => {
    setError('')

    if (mode === 'phone') {
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        setError('请输入有效的手机号')
        return
      }
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('请输入有效的邮箱地址')
        return
      }
    }

    setIsLoading(true)
    try {
      if (mode === 'phone') {
        await authApi.sendResetCode(phone)
      } else {
        await authApi.sendEmailCode(email, 'reset')
      }
      setStep('verify')
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError('发送验证码失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    setError('')

    if (code.length !== 6) {
      setError('请输入6位验证码')
      return
    }

    setIsLoading(true)
    try {
      if (mode === 'phone') {
        await authApi.resetPassword(phone, code, password)
      } else {
        await authApi.verifyEmailCode(email, code)
      }
      setStep('password')
    } catch (err: any) {
      setError(err?.message || err?.reason || '验证码错误')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('密码至少6位')
      return
    }

    if (password !== confirmPassword) {
      setError('两次密码不一致')
      return
    }

    setIsLoading(true)
    try {
      if (mode === 'phone') {
        await authApi.resetPassword(phone, code, password)
      } else {
        // For email mode, verify code first then change password
        const verifyResult = await authApi.verifyEmailCode(email, code)
        if (!verifyResult.success) {
          setError('验证码错误')
          setIsLoading(false)
          return
        }
        // TODO: Add email password reset endpoint
        setError('邮箱重置密码功能开发中，请使用手机号找回密码')
        setIsLoading(false)
        return
      }

      setSuccess('密码重置成功！')
      setConfirmModal({
        open: true,
        message: '密码已重置，请使用新密码登录',
        onConfirm: () => navigate('/login')
      })
    } catch (err: any) {
      setError(err?.message || '重置密码失败')
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
      <div className={styles.nebula} />

      <div className={styles.content}>
        <div className={styles.header}>
          <a href="/login" className={styles.backLink}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            返回登录
          </a>

          <div className={styles.title}>
            <span className={styles.titleMain}>找回密码</span>
            <span className={styles.subtitle}>验证身份后重置密码</span>
          </div>
        </div>

        <div className={styles.card}>
          {/* Mode Tabs */}
          <div className={styles.modeTabs}>
            <button
              className={`${styles.modeTab} ${mode === 'phone' ? styles.modeTabActive : ''}`}
              onClick={() => {
                setMode('phone')
                setStep('account')
                setError('')
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              手机找回
            </button>
            <button
              className={`${styles.modeTab} ${mode === 'email' ? styles.modeTabActive : ''}`}
              onClick={() => {
                setMode('email')
                setStep('account')
                setError('')
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              邮箱找回
            </button>
          </div>

          {/* Step Indicator */}
          <div className={styles.stepIndicator}>
            <div className={`${styles.stepDot} ${step === 'account' ? styles.stepDotActive : step === 'verify' || step === 'password' ? styles.stepDotDone : ''}`} />
            <div className={styles.stepLine} />
            <div className={`${styles.stepDot} ${step === 'verify' ? styles.stepDotActive : step === 'password' ? styles.stepDotDone : ''}`} />
            <div className={styles.stepLine} />
            <div className={`${styles.stepDot} ${step === 'password' ? styles.stepDotActive : ''}`} />
          </div>

          {step === 'account' && (
            <form onSubmit={(e) => { e.preventDefault(); handleSendCode(); }} className={styles.form}>
              <div className={styles.inputGroup}>
                {mode === 'phone' ? (
                  <div className={styles.inputWrapper}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <input
                      type="tel"
                      placeholder="请输入注册手机号"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className={styles.input}
                    />
                  </div>
                ) : (
                  <div className={styles.inputWrapper}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <input
                      type="email"
                      placeholder="请输入注册邮箱"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                )}
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.submitButton} disabled={isLoading}>
                {isLoading ? <LoadingSpinner /> : '发送验证码'}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className={styles.form}>
              <div className={styles.inputGroup}>
                <div className={styles.codeRow}>
                  <div className={styles.inputWrapper}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="请输入验证码"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={`${styles.input} ${styles.codeInput}`}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.sendCodeButton}
                    onClick={handleSendCode}
                    disabled={countdown > 0 || isLoading}
                  >
                    {countdown > 0 ? `${countdown}s` : '重新获取'}
                  </button>
                </div>
                <p className={styles.hint}>
                  验证码已发送至 {mode === 'phone' ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : email.replace(/(.{2}).+(@.+)/, '$1***$2')}
                </p>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.submitButton} disabled={isLoading}>
                {isLoading ? <LoadingSpinner /> : '验证'}
              </button>

              <button
                type="button"
                className={styles.backButton}
                onClick={() => setStep('account')}
              >
                返回
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleResetPassword} className={styles.form}>
              <div className={styles.inputGroup}>
                <div className={styles.inputWrapper}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type="password"
                    placeholder="设置新密码（至少6位）"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.passwordHints}>
                  <span className={`${styles.hint} ${password.length >= 6 ? styles.hintOk : ''}`}>
                    {password.length >= 6 ? '✓' : '○'} 至少6位
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
                    placeholder="确认新密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              {error && <p className={styles.error}>{error}</p>}
              {success && <p className={styles.success}>{success}</p>}

              <button type="submit" className={styles.submitButton} disabled={isLoading}>
                {isLoading ? <LoadingSpinner /> : '重置密码'}
              </button>
            </form>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        title="密码重置成功"
        message={confirmModal.message}
        confirmText="去登录"
        cancelText="关闭"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  )
}
