import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Toast } from '../components/ui/Toast'
import { ExportDataModal } from '../components/ExportDataModal'
import { Statistics } from '../components/Statistics'
import { Breadcrumb } from '../components/Breadcrumb'
import { PersonalizedRecommendations } from '../components/PersonalizedRecommendations'
import { AIQualityAnalytics } from '../components/AIQualityAnalytics'
import { useDreamStore, ACHIEVEMENTS } from '../hooks/useDreamStore'
import { shareApi, UserStats, checkInApi, api, wallApi, type DreamWallPost } from '../services/api'
import styles from './Profile.module.css'

// Medal definitions (mirrors server-side MEDALS)
const MEDALS = [
  { id: 'moonlight', name: '月光勋章', icon: '🌙', description: '朋友圈首次分享' },
  { id: 'newmoon', name: '新月勋章', icon: '🌑', description: '邀请好友成功' },
  { id: 'meteor', name: '流星成就', icon: '☄️', description: '连续分享7天' }
]

const FONT_SIZE_OPTIONS = [
  { value: 'small' as const, label: '小', size: '12px' },
  { value: 'medium' as const, label: '中', size: '14px' },
  { value: 'large' as const, label: '大', size: '16px' }
]

const THEME_OPTIONS = [
  { value: 'starry' as const, label: '星夜', icon: '🌙', desc: '深邃星空' },
  { value: 'aurora' as const, label: '极光', icon: '🌌', desc: '神秘极光' },
  { value: 'dark' as const, label: '暗黑', icon: '🌑', desc: '深邃静谧' }
]

// Helper to format stat values with skeleton loading
const formatStatValue = (value: number | null): string => {
  if (value === null) return '--'
  return value.toLocaleString()
}

export function Profile() {
  const navigate = useNavigate()
  const { history, achievements, clearHistory, fontSize, setFontSize, theme, setTheme, reduceMotion, setReduceMotion, points, medals, consecutiveShares, setShareStats, currentSession, logout, user, checkedInToday, consecutiveDays, setCheckInStatus, setHistory } = useDreamStore()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [shareStats, setShareStatsLocal] = useState<UserStats | null>(null)
  const [favorites, setFavorites] = useState<DreamWallPost[]>([])
  const [storyFavorites, setStoryFavorites] = useState<Array<{ sessionId: string; storyTitle: string; story: string; createdAt: string; date: string }>>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'favorites' | 'settings'>('overview')

  // Initialize with local history to avoid flash of zeros, will be updated by backend sync
  const [totalDreams, setTotalDreams] = useState<number | null>(null)
  const [totalWords, setTotalWords] = useState<number | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(true)

  // Sync history from backend when user is logged in
  useEffect(() => {
    let isMounted = true
    const openid = localStorage.getItem('yeelin_openid') || user?.openid
    if (!openid) return

    const syncHistory = async () => {
      try {
        const res = await api.getHistory(openid, 1, 100) // Fetch more items for stats
        if (!isMounted) return

        // Update total stats from backend pagination
        if (res.data?.pagination) {
          setTotalDreams(res.data.pagination.total)
        }

        if (res.data?.sessions && res.data.sessions.length > 0) {
          // Calculate total words from backend sessions
          const words = res.data.sessions.reduce((acc: number, s: any) => acc + (s.story?.length || 0), 0)
          setTotalWords(words)

          // Build backend map for merging (same logic as History.tsx)
          const backendMap = new Map(res.data.sessions.map((s: any) => [s.id, s]))

          // Use backend data for authoritative fields, preserve local-only fields
          const currentHistory = useDreamStore.getState().history
          const merged = currentHistory.map((item: any) => {
            const backend = backendMap.get(item.id)
            if (!backend) return item // Local-only item (e.g., draft), keep it
            return {
              ...item,
              storyTitle: backend.storyTitle,
              story: backend.story,
              dreamSnippet: backend.dreamFragment?.slice(0, 100) + (backend.dreamFragment?.length > 100 ? '...' : '') || '',
              sessionId: backend.sessionId || item.sessionId,
            }
          })

          // Add new items from backend that don't exist locally
          ;(res.data?.sessions || []).forEach((s: any) => {
            if (!merged.find((item: any) => item.id === s.id || item.sessionId === s.sessionId)) {
              merged.push({
                id: s.id,
                sessionId: s.sessionId || s.id,
                date: s.date,
                dreamSnippet: s.dreamFragment?.slice(0, 100) + (s.dreamFragment?.length > 100 ? '...' : '') || '',
                storyTitle: s.storyTitle || '',
                story: s.story || '',
                questions: [],
                answers: [],
                tags: []
              })
            }
          })

          setHistory(merged)
        } else {
          // No sessions from backend, still update totals
          setTotalDreams(0)
          setTotalWords(0)
        }
      } catch (err) {
        console.error('Failed to sync history from backend:', err)
        // Fallback to local history for display
        if (isMounted) {
          setTotalDreams(history.length)
          setTotalWords(history.reduce((acc, item) => acc + item.story.length, 0))
        }
      }
    }

    syncHistory()
      .finally(() => {
        if (isMounted) setIsStatsLoading(false)
      })
    return () => { isMounted = false }
  }, [user?.openid])

  // Fetch favorites when tab is active
  useEffect(() => {
    if (activeTab !== 'favorites') return
    const openid = localStorage.getItem('yeelin_openid') || user?.openid
    if (!openid) return

    const fetchFavorites = async () => {
      try {
        const res = await wallApi.getFavorites({ page: 1, limit: 50 })
        setFavorites(res.data?.posts)
      } catch (err) {
        console.error('Failed to fetch favorites:', err)
        setFavorites([])
      }
    }

    fetchFavorites()

    const fetchStoryFavorites = async () => {
      try {
        const res = await wallApi.getStoryFavorites()
        if (res.success) {
          setStoryFavorites(res.data?.stories || [])
        }
      } catch (err) {
        console.error('Failed to fetch story favorites:', err)
        setStoryFavorites([])
      }
    }
    fetchStoryFavorites()
  }, [activeTab, user?.openid])

  // Fetch share stats on mount
  useEffect(() => {
    const openid = localStorage.getItem('yeelin_openid') || user?.openid || currentSession.openid
    if (!openid) return

    const fetchStats = async () => {
      try {
        const stats = await shareApi.getStats(openid)
        setShareStatsLocal(stats.data || stats)
        setShareStats({
          points: stats.data?.points,
          medals: stats.data?.medals,
          consecutiveShares: stats.data?.consecutiveShares,
          lastShareDate: stats.data?.lastShareDate
        })
      } catch (err) {
        console.error('Failed to fetch share stats:', err)
      }
    }
    fetchStats()

    // Fetch check-in status
    const fetchCheckInStatus = async () => {
      try {
        const status = await checkInApi.getStatus()
        if (status.success && status.data) {
          setCheckInStatus(status.data.checkedInToday, status.data.consecutiveDays)
        }
      } catch (err) {
        console.error('Failed to fetch check-in status:', err)
      }
    }
    fetchCheckInStatus()
  }, [user?.openid, currentSession.openid])

  const handleCreateInvite = async () => {
    const openid = localStorage.getItem('yeelin_openid') || user?.openid || currentSession.openid
    if (!openid) return

    try {
      const result = await shareApi.createInvite(openid)
      if (result.success && result.data?.inviteUrl) {
        await navigator.clipboard.writeText(result.data.inviteUrl)
        setToastMessage('邀请链接已复制到剪贴板')
        setToastVisible(true)
      }
    } catch (err) {
      setToastMessage('创建邀请失败')
      setToastVisible(true)
    }
  }

  const handleClearHistory = () => {
    clearHistory()
    setShowClearConfirm(false)
    setToastMessage('历史记录已清除')
    setToastVisible(true)
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '首页', href: '/' },
            { label: '个人中心' }
          ]}
        />
        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <svg viewBox="0 0 60 60" fill="none">
              {/* Person silhouette with halo representing personal center */}
              <circle cx="30" cy="20" r="12" fill="url(#profileHeadGrad)" />
              <path d="M12 52c0-10 8-16 18-16s18 6 18 16" fill="url(#profileBodyGrad)" />
              <circle cx="30" cy="10" r="18" stroke="url(#profileHaloGrad)" strokeWidth="2" strokeOpacity="0.6" fill="none" />
              <circle cx="30" cy="10" r="22" stroke="url(#profileHaloGrad)" strokeWidth="1" strokeOpacity="0.3" fill="none" />
              <defs>
                <radialGradient id="profileHeadGrad" cx="50%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#FFD666" />
                  <stop offset="100%" stopColor="#F4D35E" />
                </radialGradient>
                <linearGradient id="profileBodyGrad" x1="12" y1="36" x2="48" y2="52">
                  <stop offset="0%" stopColor="#B8A9C9" />
                  <stop offset="100%" stopColor="#8B7BA8" />
                </linearGradient>
                <linearGradient id="profileHaloGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFD666" />
                  <stop offset="100%" stopColor="#F4D35E" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className={styles.title}>梦境档案</h1>
        </header>

        {/* Tab Navigation */}
        <div className={styles.tabNav} role="tablist">
          <button
            id="tab-overview"
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('overview')}
            role="tab"
            aria-selected={activeTab === 'overview'}
            aria-controls="panel-overview"
          >
            概览
          </button>
          <button
            id="tab-achievements"
            className={`${styles.tabBtn} ${activeTab === 'achievements' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('achievements')}
            role="tab"
            aria-selected={activeTab === 'achievements'}
            aria-controls="panel-achievements"
          >
            成就
          </button>
          <button
            id="tab-settings"
            className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('settings')}
            role="tab"
            aria-selected={activeTab === 'settings'}
            aria-controls="panel-settings"
          >
            设置
          </button>
          <button
            id="tab-favorites"
            className={`${styles.tabBtn} ${activeTab === 'favorites' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('favorites')}
            role="tab"
            aria-selected={activeTab === 'favorites'}
            aria-controls="panel-favorites"
          >
            收藏
          </button>
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview">
          <>
            <div className={styles.stats} aria-busy={isStatsLoading ? 'true' : undefined}>
              <div className={styles.statCard}>
                <span className={`${styles.statValue} ${isStatsLoading ? styles.statSkeleton : ''}`} role="status" aria-live="polite">
                  {formatStatValue(totalDreams)}
                </span>
                <span className={styles.statLabel}>记录梦境</span>
              </div>
              <div className={styles.statCard}>
                <span className={`${styles.statValue} ${isStatsLoading ? styles.statSkeleton : ''}`} role="status" aria-live="polite">
                  {formatStatValue(totalWords)}
                </span>
                <span className={styles.statLabel}>累计文字</span>
              </div>
            </div>

            {/* Check-in Stats */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>每日签到</h2>
              <div className={styles.shareStats}>
                <div className={styles.pointsCard}>
                  <span className={styles.pointsValue}>{consecutiveDays}</span>
                  <span className={styles.pointsLabel}>连续签到</span>
                </div>
                <div className={styles.shareInfo}>
                  <div className={styles.streakInfo}>
                    <span className={styles.streakIcon}>{checkedInToday ? '✅' : '📅'}</span>
                    <span>{checkedInToday ? '今日已签到' : '今日未签到'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Share Stats */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>分享积分</h2>
              <div className={styles.shareStats}>
                <div className={styles.pointsCard}>
              <span className={styles.pointsValue}>{points}</span>
              <span className={styles.pointsLabel}>梦境积分</span>
            </div>
            <div className={styles.shareInfo}>
              <div className={styles.streakInfo}>
                <span className={styles.streakIcon}>🔥</span>
                <span>连续分享 <strong>{consecutiveShares}</strong> 天</span>
              </div>
              <p className={styles.earningHint}>发朋友圈 +5 · 发链接 +2 · 好友完成 +10</p>
            </div>
          </div>
        </div>

          {/* Medals */}
          <div className={styles.medalsGrid}>
            {MEDALS.map((medal) => {
              const isUnlocked = medals.includes(medal.id)
              return (
                <div
                  key={medal.id}
                  className={`${styles.medalCard} ${isUnlocked ? styles.medalUnlocked : ''}`}
                  title={isUnlocked ? `${medal.name} - ${medal.description}` : `解锁条件: ${medal.description}`}
                  aria-label={`${medal.name}，${isUnlocked ? '已解锁' : `未解锁，解锁条件: ${medal.description}`}`}
                >
                  <span className={styles.medalIcon}>{medal.icon}</span>
                  <div className={styles.medalInfo}>
                    <span className={styles.medalName}>{medal.name}</span>
                    <span className={styles.medalDesc}>{medal.description}</span>
                  </div>
                  {isUnlocked && (
                    <svg className={styles.medalCheck} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>

          {/* Invite */}
          <div className={styles.inviteSection}>
            <div className={styles.inviteInfo}>
              <span className={styles.inviteLabel}>邀请好友</span>
              <span className={styles.inviteDesc}>邀请码: {shareStats?.inviteCode || '----'}</span>
            </div>
            <Button onClick={handleCreateInvite} size="sm">
              邀请
            </Button>
          </div>
          </>
          </div>
        )}

        {/* Tab: Achievements */}
        {activeTab === 'achievements' && (
          <div id="panel-achievements" role="tabpanel" aria-labelledby="tab-achievements">
            {/* Statistics Visualization */}
            {history.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>记录统计</h2>
                <Statistics history={history} />
              </div>
            )}

            {/* Personalized Recommendations */}
            <PersonalizedRecommendations />

            {/* Achievements */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>成就</h2>
              <div className={styles.achievementsGrid}>
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = achievements.includes(achievement.id)
              // 计算动态提示
              const getDynamicHint = () => {
                if (achievement.id === 'first_dream') {
                  return history.length === 0 ? '记录你的第一个梦境即可解锁' : null
                }
                if (achievement.id === 'story_collector') {
                  const current = history.length
                  const total = 10
                  return current < total ? `${current}/${total} 故事` : null
                }
                return null
              }
              const dynamicHint = !isUnlocked ? getDynamicHint() : null
              const hintText = dynamicHint || achievement.hint

              return (
                <div
                  key={achievement.id}
                  className={`${styles.achievementCard} ${isUnlocked ? styles.unlocked : ''} ${!isUnlocked && hintText ? styles.locked : ''}`}
                >
                  <span className={styles.achievementIcon}>{achievement.icon}</span>
                  <div className={styles.achievementInfo}>
                    <span className={styles.achievementTitle}>{achievement.title}</span>
                    <span className={styles.achievementDesc}>{achievement.description}</span>
                    {!isUnlocked && hintText && (
                      <span className={styles.achievementHint}>{hintText}</span>
                    )}
                  </div>
                  {isUnlocked && (
                    <svg className={styles.achievementCheck} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        </div>
          </div>
        )}

        {/* Tab: Favorites */}
        {activeTab === 'favorites' && (
          <div id="panel-favorites" role="tabpanel" aria-labelledby="tab-favorites" className={styles.section}>
            <h2 className={styles.sectionTitle}>我的收藏</h2>

            {/* 他山之梦 */}
            <section className={styles.favoritesSubSection}>
              <div className={styles.favoritesSubHeader}>
                <h3 className={styles.favoritesSubTitle}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  他山之梦 ({favorites.length})
                </h3>
                <Link to="/favorites?tab=wall" className={styles.favoritesViewAll}>
                  查看全部
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>
              {favorites.length === 0 ? (
                <div className={styles.emptySubState}>
                  <p>在梦墙收藏的故事会出现在这里</p>
                </div>
              ) : (
                <div className={styles.historyList}>
                  {favorites.slice(0, 3).map((post) => (
                    <Link
                      key={post.id}
                      to={`/wall?post=${post.id}`}
                      className={styles.historyItem}
                    >
                      <div className={styles.historyItemHeader}>
                        <span className={styles.historyItemDate}>
                          {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <h3 className={styles.historyItemTitle}>{post.storyTitle}</h3>
                      <p className={styles.historyItemSnippet}>
                        {post.storySnippet || post.storyFull?.slice(0, 80)}...
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* 原创之梦 */}
            <section className={styles.favoritesSubSection}>
              <div className={styles.favoritesSubHeader}>
                <h3 className={styles.favoritesSubTitle}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
                    <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
                  </svg>
                  原创之梦 ({storyFavorites.length})
                </h3>
                <Link to="/favorites?tab=story" className={styles.favoritesViewAll}>
                  查看全部
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>
              {storyFavorites.length === 0 ? (
                <div className={styles.emptySubState}>
                  <p>在历史记录中点击★收藏的故事会出现在这里</p>
                </div>
              ) : (
                <div className={styles.historyList}>
                  {storyFavorites.slice(0, 3).map((item) => (
                    <Link
                      key={item.sessionId}
                      to={`/story/${item.sessionId}`}
                      className={styles.historyItem}
                    >
                      <div className={styles.historyItemHeader}>
                        <span className={styles.historyItemDate}>{item.date}</span>
                      </div>
                      <h3 className={styles.historyItemTitle}>{item.storyTitle}</h3>
                      <p className={styles.historyItemSnippet}>
                        {item.story?.slice(0, 80)}...
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab: Settings */}
        {activeTab === 'settings' && (
          <div id="panel-settings" role="tabpanel" aria-labelledby="tab-settings">
        {/* Display Settings */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>显示</h2>
          <div className={styles.settingsList}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>字体大小</span>
                <span className={styles.settingDesc}>调整应用内文字大小</span>
              </div>
              <div className={styles.fontSizeSelector}>
                {FONT_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.fontSizeBtn} ${fontSize === option.value ? styles.fontSizeActive : ''}`}
                    onClick={() => setFontSize(option.value)}
                    aria-pressed={fontSize === option.value}
                    title={`字体大小: ${option.label}`}
                  >
                    <span style={{ fontSize: option.size }}>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>主题皮肤</span>
                <span className={styles.settingDesc}>选择界面配色方案</span>
              </div>
              <div className={styles.themeSelector}>
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.themeBtn} ${theme === option.value ? styles.themeActive : ''}`}
                    onClick={() => setTheme(option.value)}
                    aria-pressed={theme === option.value}
                    title={option.desc}
                  >
                    <span className={styles.themeIcon}>{option.icon}</span>
                    <span className={styles.themeLabel}>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>减少动画</span>
                <span className={styles.settingDesc}>降低界面动画效果</span>
              </div>
              <button
                className={`${styles.toggle} ${reduceMotion ? styles.toggleActive : ''}`}
                onClick={() => setReduceMotion(!reduceMotion)}
                role="switch"
                aria-checked={reduceMotion}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>数据管理</h2>
          <div className={styles.settingsList}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>清除所有历史记录</span>
                <span className={styles.settingDesc}>此操作不可恢复</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                disabled={totalDreams === 0}
              >
                清除
              </Button>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>导出我的数据</span>
                <span className={styles.settingDesc}>将导出所有个人信息</span>
              </div>
              <button
                className={styles.exportBtn}
                onClick={() => setShowExportModal(true)}
                aria-label="导出我的数据"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
            {user && (
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>退出登录</span>
                  <span className={styles.settingDesc}>切换账号或退出当前账号</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogoutConfirm(true)}
                >
                  退出
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* About */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>关于</h2>
          <div className={styles.aboutText}>
            <p>夜棂 v1.0.0</p>
            <p>记录你的每一个梦境</p>
          </div>
        </div>
          </div>
        )}

        {/* AI Quality Analytics (for team review) */}
        <AIQualityAnalytics />
      </div>

      <ConfirmModal
        isOpen={showClearConfirm}
        title="确认清除"
        message="确定要清除所有历史记录吗？此操作不可恢复。"
        confirmText="清除"
        cancelText="取消"
        onConfirm={handleClearHistory}
        onCancel={() => setShowClearConfirm(false)}
        danger
      />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="退出登录"
        message="确定要退出当前登录吗？"
        confirmText="退出"
        cancelText="取消"
        onConfirm={() => {
          logout()
          navigate('/login')
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />

      <ExportDataModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  )
}
