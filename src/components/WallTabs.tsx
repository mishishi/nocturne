import styles from './WallTabs.module.css'

type TabType = 'all' | 'featured' | 'my' | 'friends'

interface WallTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  isLoggedIn: boolean
}

export function WallTabs({ activeTab, onTabChange, isLoggedIn }: WallTabsProps) {
  return (
    <div className={styles.tabs} role="tablist">
      <button
        className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
        onClick={() => onTabChange('all')}
        role="tab"
        aria-selected={activeTab === 'all'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a7 7 0 0 1 0 14 7 7 0 0 1 0-14" />
        </svg>
        全部
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'featured' ? styles.active : ''}`}
        onClick={() => onTabChange('featured')}
        role="tab"
        aria-selected={activeTab === 'featured'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        本周精选
      </button>
      {isLoggedIn && (
        <button
          className={`${styles.tab} ${activeTab === 'friends' ? styles.active : ''}`}
          onClick={() => onTabChange('friends')}
          role="tab"
          aria-selected={activeTab === 'friends'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          关注的人
        </button>
      )}
      <button
        className={`${styles.tab} ${activeTab === 'my' ? styles.active : ''}`}
        onClick={() => onTabChange('my')}
        role="tab"
        aria-selected={activeTab === 'my'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        我的发布
      </button>
    </div>
  )
}
