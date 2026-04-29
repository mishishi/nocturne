import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { friendApi } from '../services/api'
import { ConfirmModal } from './ui/ConfirmModal'
import styles from './BottomNav.module.css'

const DRAFT_KEY = 'yeelin_draft'

const NAV_ITEMS = [
  {
    path: '/',
    label: '首页',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  },
  {
    path: '/wall',
    label: '梦墙',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a7 7 0 0 1 0 14 7 7 0 0 1 0-14" />
        <circle cx="12" cy="9" r="3" />
      </svg>
    )
  },
  {
    path: '/history',
    label: '历史',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
  },
  {
    path: '/friends',
    label: '好友',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )
  },
  {
    path: '/profile',
    label: '我的',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  }
]

export function BottomNav() {
  const location = useLocation()
  const { recentlyUnlocked, user } = useDreamStore()
  const [pendingCount, setPendingCount] = useState(0)
  const [showDraftConfirm, setShowDraftConfirm] = useState(false)

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
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [user?.openid])

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className={styles.nav} aria-label="底部导航">
      <div className={styles.tabList} role="tablist">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`${styles.tab} ${isActive(item.path) ? styles.active : ''}`}
            role="tab"
            aria-current={isActive(item.path) ? 'page' : undefined}
            aria-label={item.label}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
            {item.path === '/profile' && recentlyUnlocked.length > 0 && (
              <span className={styles.badge} aria-label={`${recentlyUnlocked.length}个新成就`}>
                {recentlyUnlocked.length}
              </span>
            )}
            {item.path === '/friends' && pendingCount > 0 && (
              <span className={styles.badge} aria-label={`${pendingCount}个待处理好友请求`}>
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Floating Action Button for recording */}
      <button
        className={styles.fab}
        aria-label="记录梦境"
        onClick={() => {
          const hasDraft = localStorage.getItem(DRAFT_KEY)
          if (hasDraft) {
            setShowDraftConfirm(true)
          }
        }}
      >
        <Link to="/dream?new=1" className={styles.fabLink}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </button>

      <ConfirmModal
        isOpen={showDraftConfirm}
        title="放弃当前草稿？"
        message="你有一段未完成的梦境记录，开始新记录将丢失当前内容。"
        confirmText="开始新记录"
        cancelText="继续编辑"
        onConfirm={() => {
          localStorage.removeItem(DRAFT_KEY)
          setShowDraftConfirm(false)
          window.location.href = '/dream?new=1'
        }}
        onCancel={() => setShowDraftConfirm(false)}
        danger
      />
    </nav>
  )
}
