import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, AdminStats } from '../../services/api'
import styles from './Dashboard.module.css'

// SVG Icons
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
)

const LibraryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
)

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const LightningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const TrendingUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const result = await adminApi.getStats()
      if (result.success) {
        setStats(result.data)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>加载中...</span>
      </div>
    )
  }

  const pendingPosts = stats?.pendingPosts ?? 0
  const postsGrowth = stats?.trends?.postsGrowth ?? 0

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.greeting}>工作台</h1>
          <p className={styles.date}>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.growthBadge} data-positive={postsGrowth >= 0}>
            {postsGrowth >= 0 ? '+' : ''}{postsGrowth}% 本周增长
          </span>
        </div>
      </div>

      {/* Priority Action Area */}
      <div className={styles.prioritySection}>
        {/* Main Todo Card */}
        <div className={styles.mainTodoCard} onClick={() => navigate('/admin/pending')}>
          <div className={styles.todoContent}>
            <div className={styles.todoIcon}>
              <CheckCircleIcon />
            </div>
            <div className={styles.todoInfo}>
              <div className={styles.todoCount}>
                <span className={styles.todoNumber}>{pendingPosts}</span>
                <span className={styles.todoUnit}>篇待审核</span>
              </div>
              <div className={styles.todoHint}>
                {pendingPosts > 0 ? '点击立即处理' : '暂无待审核内容'}
              </div>
            </div>
          </div>
          <div className={styles.todoAction}>
            <span>去处理</span>
            <ArrowRightIcon />
          </div>
        </div>

        {/* Alert Card */}
        {pendingPosts > 10 && (
          <div className={styles.alertCard}>
            <div className={styles.alertIcon}>
              <WarningIcon />
            </div>
            <div className={styles.alertInfo}>
              <div className={styles.alertTitle}>待审核积压</div>
              <div className={styles.alertDesc}>当前积压 {pendingPosts} 篇，建议优先处理</div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>快捷操作</h2>
        <div className={styles.quickActions}>
          <div className={styles.quickAction} onClick={() => navigate('/admin/pending')}>
            <div className={styles.quickActionIcon} data-color="yellow">
              <ClockIcon />
            </div>
            <div className={styles.quickActionInfo}>
              <span className={styles.quickActionTitle}>待审核帖子</span>
              <span className={styles.quickActionCount}>{pendingPosts} 篇</span>
            </div>
            <div className={styles.quickActionArrow}>
              <ArrowRightIcon />
            </div>
          </div>

          <div className={styles.quickAction} onClick={() => navigate('/admin/highlights')}>
            <div className={styles.quickActionIcon} data-color="golden">
              <StarIcon />
            </div>
            <div className={styles.quickActionInfo}>
              <span className={styles.quickActionTitle}>精选候选</span>
              <span className={styles.quickActionCount}>查看候选</span>
            </div>
            <div className={styles.quickActionArrow}>
              <ArrowRightIcon />
            </div>
          </div>

          <div className={styles.quickAction} onClick={() => navigate('/admin/library')}>
            <div className={styles.quickActionIcon} data-color="purple">
              <LibraryIcon />
            </div>
            <div className={styles.quickActionInfo}>
              <span className={styles.quickActionTitle}>图书馆资产</span>
              <span className={styles.quickActionCount}>管理故事质量</span>
            </div>
            <div className={styles.quickActionArrow}>
              <ArrowRightIcon />
            </div>
          </div>

          <div className={styles.quickAction} onClick={() => navigate('/admin/comments')}>
            <div className={styles.quickActionIcon} data-color="blue">
              <ChatIcon />
            </div>
            <div className={styles.quickActionInfo}>
              <span className={styles.quickActionTitle}>评论管理</span>
              <span className={styles.quickActionCount}>管理评论</span>
            </div>
            <div className={styles.quickActionArrow}>
              <ArrowRightIcon />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>数据概览</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: 'var(--color-golden)' }}>
              {stats?.totalPosts ?? 0}
            </div>
            <div className={styles.statLabel}>总帖子数</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#48c78e' }}>
              {stats?.trends?.approvedLast7Days ?? 0}
            </div>
            <div className={styles.statLabel}>本周通过</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#ed6464' }}>
              {stats?.trends?.rejectedLast7Days ?? 0}
            </div>
            <div className={styles.statLabel}>本周拒绝</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#58a6ff' }}>
              {stats?.totalComments ?? 0}
            </div>
            <div className={styles.statLabel}>总评论数</div>
          </div>
        </div>
      </div>

      {/* Trend Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>本周趋势</h2>
        <div className={styles.trendGrid}>
          <div className={styles.trendCard}>
            <div className={styles.trendIcon} data-positive={postsGrowth >= 0}>
              <TrendingUpIcon />
            </div>
            <div className={styles.trendInfo}>
              <span className={styles.trendValue} data-positive={postsGrowth >= 0}>
                {postsGrowth >= 0 ? '+' : ''}{postsGrowth}%
              </span>
              <span className={styles.trendLabel}>帖子增长率</span>
            </div>
          </div>
          <div className={styles.trendCard}>
            <div className={styles.trendIcon} data-positive={true}>
              <RefreshIcon />
            </div>
            <div className={styles.trendInfo}>
              <span className={styles.trendValue}>
                {stats?.trends?.postsLast7Days ?? 0}
              </span>
              <span className={styles.trendLabel}>本周新增帖子</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
