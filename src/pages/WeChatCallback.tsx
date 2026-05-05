import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { api } from '../services/api'
import { Toast } from '../components/ui/Toast'
import styles from './Login.module.css'

export function WeChatCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, currentSession } = useDreamStore()

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  // Memoized star positions to avoid Math.random() on each render
  const stars = useMemo(() =>
    Array.from({ length: 80 }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 4}s`,
      animationDuration: `${2 + Math.random() * 3}s`,
      width: `${1 + Math.random() * 2}px`,
      height: `${1 + Math.random() * 2}px`
    })), []
  )

  useEffect(() => {
    const completeWeChatLogin = async () => {
      const token = searchParams.get('wechat_token')
      const userJson = searchParams.get('wechat_user')
      const error = searchParams.get('wechat_error')

      if (error || !token || !userJson) {
        // 登录失败，跳转回登录页
        navigate('/login', { replace: true })
        return
      }

      try {
        const user = JSON.parse(userJson)

        // Save guest openid before setting new token
        const guestOpenid = localStorage.getItem('yeelin_openid')

        // Store token
        localStorage.setItem('yeelin_token', token)
        localStorage.setItem('yeelin_openid', user.openid)

        // Migrate guest sessions if exists (失败不影响登录流程)
        if (guestOpenid && guestOpenid !== user.openid) {
          try {
            const result = await api.migrateSession(guestOpenid)
            if (result.success && (result.data?.migrated ?? 0) > 0) {
              showToast('检测到您有未完成的梦境，已为您保留')
            }
          } catch (err) {
            console.error('Session migration failed:', err)
          }
        }

        // Set user in store
        setUser(user, token)

        // 清除本地游客数据
        localStorage.removeItem('yeelin_guest_openid')

        // 确定重定向目标
        let redirectTo = '/'

        // 如果有未完成的会话，恢复到对应页面继续流程
        if (currentSession.status === 'answering' || currentSession.status === 'questions') {
          redirectTo = '/story'
        } else if (currentSession.status === 'story_generating' || currentSession.status === 'dream_submitted') {
          redirectTo = '/story'
        } else if (currentSession.status === 'completed') {
          // 已完成的会话，跳转到故事页面查看
          redirectTo = '/story'
        }

        // 如果有存储的返回地址，优先使用
        const storedRedirect = sessionStorage.getItem('login_redirect_from')
        if (storedRedirect) {
          redirectTo = storedRedirect
          sessionStorage.removeItem('login_redirect_from')
        }

        // 跳转到首页或admin页或返回地址
        navigate(user.isAdmin ? '/admin' : redirectTo, { replace: true })
      } catch (err) {
        console.error('WeChat callback error:', err)
        navigate('/login', { replace: true })
      }
    }

    completeWeChatLogin()
  }, [searchParams, navigate, setUser, showToast])

  return (
    <div className={styles.page}>
      <div className={styles.starfield}>
        {stars.map((star, i) => (
          <div
            key={i}
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
      <div className={styles.nebula} />
      <div className={styles.nebulaSecondary} />
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
      <div className={styles.content}>
        <div className={styles.card}>
          <p style={{ color: 'var(--color-moonlight)', textAlign: 'center' }}>
            正在进入夜棂...
          </p>
        </div>
      </div>

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
