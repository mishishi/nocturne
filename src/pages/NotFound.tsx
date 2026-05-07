import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import styles from './NotFound.module.css'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Decorative stars */}
        <div className={styles.stars}>
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={i}
              className={styles.star}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                width: `${1 + Math.random() * 2}px`,
                height: `${1 + Math.random() * 2}px`
              }}
            />
          ))}
        </div>

        {/* Floating 404 text */}
        <div className={styles.code}>404</div>

        {/* Moon illustration */}
        <div className={styles.moon}>
          <svg viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" fill="url(#moonGradient)" />
            <circle cx="35" cy="35" r="8" fill="rgba(0,0,0,0.1)" />
            <circle cx="55" cy="55" r="12" fill="rgba(0,0,0,0.08)" />
            <circle cx="65" cy="30" r="5" fill="rgba(0,0,0,0.1)" />
            <defs>
              <radialGradient id="moonGradient" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#FFF8E7" />
                <stop offset="100%" stopColor="#E8D5B7" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Message */}
        <div className={styles.content}>
          <h1 className={styles.title}>梦境迷失在星空中</h1>
          <p className={styles.description}>
            你寻找的页面似乎已经飘向遥远的星河<br />
            或者从未存在过
          </p>

          {/* Action buttons */}
          <div className={styles.actions}>
            <Button variant="primary" size="lg" onClick={() => navigate('/')}>
              返回首页
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate(-1)}>
              返回上页
            </Button>
          </div>
        </div>

        {/* Floating elements */}
        <div className={styles.floatingElements}>
          <span className={styles.floatingIcon} style={{ left: '10%', top: '20%' }}>✨</span>
          <span className={styles.floatingIcon} style={{ left: '85%', top: '15%' }}>🌙</span>
          <span className={styles.floatingIcon} style={{ left: '75%', top: '70%' }}>⭐</span>
          <span className={styles.floatingIcon} style={{ left: '15%', top: '65%' }}>✨</span>
        </div>
      </div>
    </div>
  )
}
