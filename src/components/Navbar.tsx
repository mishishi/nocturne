import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { friendApi, notificationApi } from '../services/api'
import styles from './Navbar.module.css'

export function Navbar() {
  const location = useLocation()
  const { user } = useDreamStore()
  const [pendingCount, setPendingCount] = useState(0)
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!user?.openid) {
        setPendingCount(0)
        return
      }
      try {
        const res = await friendApi.getFriendRequests()
        if (res.success) {
          setPendingCount(res.requests.length)
        }
      } catch (err) {
        console.error('Failed to fetch pending requests:', err)
      }
    }

    fetchPendingCount()
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [user?.openid])

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.openid) {
        setNotificationCount(0)
        return
      }
      try {
        const data = await notificationApi.getUnreadCount()
        if (data.success) {
          setNotificationCount(data.unreadCount)
        }
      } catch (e) {
        console.error('Failed to fetch notification count', e)
      }
    }

    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 60000) // 60s
    return () => clearInterval(interval)
  }, [user?.openid])

  const isActive = (path: string) => location.pathname === path

  return (
    <header role="banner" className={styles.header}>
      <nav className={styles.navbar} aria-label="主导航">
        <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <circle cx="15" cy="8" r="2.5" fill="currentColor" />
            </svg>
          </span>
          <span className={styles.logoText}>夜棂</span>
        </Link>

        <ul className={styles.links}>
          <li>
            <Link to="/" aria-current={isActive('/') ? 'page' : undefined} className={`${styles.link} ${isActive('/') ? styles.active : ''}`}>
              首页
            </Link>
          </li>
          <li>
            <Link to="/wall" aria-current={isActive('/wall') ? 'page' : undefined} className={`${styles.link} ${isActive('/wall') ? styles.active : ''}`}>
              梦墙
            </Link>
          </li>
          <li>
            <Link to="/friends" aria-current={isActive('/friends') ? 'page' : undefined} className={`${styles.link} ${isActive('/friends') ? styles.active : ''}`}>
              好友
              {pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
            </Link>
          </li>
          <li>
            <Link to="/history" aria-current={isActive('/history') ? 'page' : undefined} className={`${styles.link} ${isActive('/history') ? styles.active : ''}`}>
              历史
            </Link>
          </li>
          <li>
            <Link to="/favorites" aria-current={isActive('/favorites') ? 'page' : undefined} className={`${styles.link} ${isActive('/favorites') ? styles.active : ''}`}>
              收藏
            </Link>
          </li>
          <li>
            <Link to="/profile" aria-current={isActive('/profile') ? 'page' : undefined} className={`${styles.link} ${isActive('/profile') ? styles.active : ''}`}>
              我的
            </Link>
          </li>
        </ul>

        <Link to="/notifications" className={styles.notificationBell} aria-label="通知">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {notificationCount > 0 && <span className={styles.notificationBadge}>{notificationCount}</span>}
        </Link>
        </div>
      </nav>
    </header>
  )
}
