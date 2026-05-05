import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import styles from './ForgotPassword.module.css'

export function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'phone' | 'reset'>('phone')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Form data
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!phone) {
      setError('请输入手机号')
      return
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的手机号')
      return
    }

    setIsLoading(true)
    try {
      const result = await authApi.sendResetCode(phone)
      if (result.success && result.data?.success) {
        setCodeSent(true)
        setSuccessMessage('验证码已发送')
        setStep('reset')
      } else {
        setError(result.data?.message || '发送验证码失败')
      }
    } catch (err) {
      setError('网络错误，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!code || code.length !== 6) {
      setError('请输入6位验证码')
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

    setIsLoading(true)
    try {
      const result = await authApi.resetPassword(phone, code, password)
      if (result.success && result.data?.success) {
        setSuccessMessage('密码重置成功，即将跳转到登录页...')
        setTimeout(() => navigate('/login'), 1500)
      } else {
        setError(result.data?.message || '重置密码失败')
      }
    } catch (err) {
      setError('网络错误，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setStep('phone')
    setCodeSent(false)
    setCode('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setSuccessMessage('')
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

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleMain}>忘记密码</span>
            <span className={styles.titleSub}>重置你的账户访问</span>
          </h1>
        </div>

        <div className={styles.card}>
          {/* Step Indicator */}
          <div className={styles.stepIndicator}>
            <div className={`${styles.step} ${step === 'phone' ? styles.stepActive : styles.stepDone}`}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepLabel}>验证手机</span>
            </div>
            <div className={styles.stepLine} />
            <div className={`${styles.step} ${step === 'reset' ? styles.stepActive : ''}`}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepLabel}>重置密码</span>
            </div>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className={styles.form}>
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
              </div>

              {error && <p className={styles.error}>{error}</p>}
              {successMessage && <p className={styles.success}>{successMessage}</p>}

              <button type="submit" className={styles.submitButton} disabled={isLoading}>
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    发送验证码
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.arrowIcon}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>

              <p className={styles.hint}>
                演示版本验证码为 <strong>123456</strong>
              </p>

              <p className={styles.loginLink}>
                想起密码了？<a href="/login" className={styles.link}>立即登录</a>
              </p>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className={styles.form}>
              <div className={styles.inputGroup}>
                <div className={styles.phoneDisplay}>
                  <span className={styles.phoneLabel}>验证码已发送至</span>
                  <span className={styles.phoneValue}>{phone}</span>
                  <button type="button" className={styles.changePhone} onClick={handleBack}>
                    修改
                  </button>
                </div>

                <div className={styles.inputWrapper}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="6位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={styles.input}
                    maxLength={6}
                  />
                </div>

                <div className={styles.inputWrapper}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.inputIcon}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type="password"
                    placeholder="新密码（至少6位）"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    autoComplete="new-password"
                  />
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
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && <p className={styles.error}>{error}</p>}
              {successMessage && <p className={styles.success}>{successMessage}</p>}

              <button type="submit" className={styles.submitButton} disabled={isLoading}>
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    重置密码
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.arrowIcon}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>

              <button
                type="button"
                className={styles.backButton}
                onClick={handleBack}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                返回
              </button>
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
    </div>
  )
}
