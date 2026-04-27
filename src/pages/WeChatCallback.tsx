import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { api } from '../services/api'
import styles from './Login.module.css'

export function WeChatCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser } = useDreamStore()

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

        // Store token
        localStorage.setItem('yeelin_token', token)
        localStorage.setItem('yeelin_openid', user.openid)

        // Migrate guest sessions if exists
        const guestOpenid = localStorage.getItem('yeelin_openid')
        if (guestOpenid && guestOpenid !== user.openid) {
          await api.migrateSession(guestOpenid, user.openid)
        }

        // Set user in store
        setUser(user, token)

        // 跳转到首页
        navigate('/', { replace: true })
      } catch (err) {
        console.error('WeChat callback error:', err)
        navigate('/login', { replace: true })
      }
    }

    completeWeChatLogin()
  }, [searchParams, navigate, setUser])

  return (
    <div className={styles.page}>
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
    </div>
  )
}
