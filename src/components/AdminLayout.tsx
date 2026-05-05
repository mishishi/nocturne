import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDreamStore } from '../hooks/useDreamStore'
import { ConfirmModal } from './ui/ConfirmModal'
import styles from './AdminLayout.module.css'

const ADMIN_TABS = [
  {
    path: '/admin/pending',
    label: '待审核',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    path: '/admin/comments',
    label: '评论管理',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )
  },
  {
    path: '/admin/stats',
    label: '数据统计',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  }
]

// Moon icon for header
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
)

// Home icon
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

// Settings icon
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

// Logout icon
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

// Reduce motion icon
const ReduceMotionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

// Font size icon
const FontSizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 7V4h16v3M9 20h6M12 4v16" />
  </svg>
)


export function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, reduceMotion, setReduceMotion, fontSize, setFontSize } = useDreamStore()

  const [showSettings, setShowSettings] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const activeTab = ADMIN_TABS.find(tab => location.pathname.startsWith(tab.path))?.path || '/admin/pending'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className={styles.layout}>
      {/* Top Navigation Bar */}
      <nav className={styles.topNav}>
        <div className={styles.navLeft}>
          <button
            className={styles.backButton}
            onClick={() => navigate('/')}
            aria-label="返回首页"
          >
            <HomeIcon />
          </button>
        </div>

        <div className={styles.navCenter}>
          <div className={styles.moonIcon}>
            <MoonIcon />
          </div>
          <h1 className={styles.navTitle}>管理后台</h1>
          <span className={styles.adminBadge}>Admin</span>
        </div>

        <div className={styles.navRight}>
          <button
            className={styles.navIconBtn}
            onClick={() => setShowSettings(!showSettings)}
            aria-label="设置"
            aria-expanded={showSettings}
          >
            <SettingsIcon />
          </button>
        </div>

      </nav>

      {/* Settings Dropdown */}
      {showSettings && (
        <>
          <div className={styles.settingsOverlay} onClick={() => setShowSettings(false)} />
          <div className={styles.settingsDropdown}>
            <div className={styles.settingsGroup}>
              <div className={styles.settingsLabel}>
                <FontSizeIcon />
                <span>字体大小</span>
              </div>
              <div className={styles.settingsOptions}>
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button
                    key={size}
                    className={`${styles.settingsOption} ${fontSize === size ? styles.active : ''}`}
                    onClick={() => setFontSize(size)}
                  >
                    {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.settingsGroup}>
              <div className={styles.settingsLabel}>
                <ReduceMotionIcon />
                <span>减少动画</span>
              </div>
              <button
                className={`${styles.toggleBtn} ${reduceMotion ? styles.active : ''}`}
                onClick={() => setReduceMotion(!reduceMotion)}
                aria-pressed={reduceMotion}
              >
                <span className={styles.toggleTrack}>
                  <span className={styles.toggleThumb} />
                </span>
              </button>
            </div>

            <div className={styles.settingsDivider} />

            <button
              className={styles.logoutBtn}
              onClick={() => {
                setShowSettings(false)
                setShowLogoutConfirm(true)
              }}
            >
              <LogoutIcon />
              <span>退出登录</span>
            </button>
          </div>
        </>
      )}

      {/* Tab Navigation */}
      <nav className={styles.tabs}>
        {ADMIN_TABS.map(tab => (
          <button
            key={tab.path}
            className={`${styles.tab} ${activeTab === tab.path ? styles.active : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className={styles.icon}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className={styles.content}>
        {children}
      </main>

      {/* Logout Confirmation */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="退出登录"
        message="确定要退出管理后台吗？"
        confirmText="退出"
        cancelText="取消"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        danger
      />
    </div>
  )
}
