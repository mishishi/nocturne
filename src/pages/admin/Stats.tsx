import { useState, useEffect } from 'react'
import { adminApi, AdminStats } from '../../services/api'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import styles from './Stats.module.css'

// Icons
const PostsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
  </svg>
)

const CommentsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const TrendUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const TrendDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
)

export function Stats() {
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

  const weeklyData = [
    { name: '本周发帖', value: stats?.trends?.postsLast7Days ?? 0, color: '#f4d35e' },
    { name: '本周通过', value: stats?.trends?.approvedLast7Days ?? 0, color: '#48c78e' },
    { name: '本周拒绝', value: stats?.trends?.rejectedLast7Days ?? 0, color: '#ed6464' },
  ]

  return (
    <div className={styles.stats}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>数据统计</h1>
        <span className={styles.subtitle}>分析内容运营趋势</span>
      </div>

      {/* Key Metrics Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} data-color="golden">
            <PostsIcon />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{stats?.totalPosts ?? 0}</span>
            <span className={styles.metricLabel}>总帖子数</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} data-color="yellow">
            <CheckIcon />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{stats?.trends?.approvedLast7Days ?? 0}</span>
            <span className={styles.metricLabel}>本周通过</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} data-color="red">
            <CloseIcon />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{stats?.trends?.rejectedLast7Days ?? 0}</span>
            <span className={styles.metricLabel}>本周拒绝</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} data-color="blue">
            <CommentsIcon />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{stats?.totalComments ?? 0}</span>
            <span className={styles.metricLabel}>总评论数</span>
          </div>
        </div>
      </div>

      {/* Growth Indicator */}
      <div className={styles.growthSection}>
        <div className={styles.growthCard} data-positive={(stats?.trends?.postsGrowth ?? 0) >= 0}>
          <div className={styles.growthIcon}>
            {(stats?.trends?.postsGrowth ?? 0) >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
          </div>
          <div className={styles.growthInfo}>
            <span className={styles.growthValue}>
              {(stats?.trends?.postsGrowth ?? 0) >= 0 ? '+' : ''}{stats?.trends?.postsGrowth ?? 0}%
            </span>
            <span className={styles.growthLabel}>本周发帖增长率</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        {/* 7-Day Trend Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>7日发布趋势</h2>
            <span className={styles.chartSubtitle}>每日发帖数量走势</span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats?.dailyStats || []}>
                <defs>
                  <linearGradient id="postsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f4d35e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f4d35e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="dateLabel"
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(20, 20, 30, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                />
                <Area
                  type="monotone"
                  dataKey="posts"
                  stroke="#f4d35e"
                  strokeWidth={2}
                  fill="url(#postsGradient)"
                  name="发帖数"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Comparison Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>本周数据对比</h2>
            <span className={styles.chartSubtitle}>发帖 vs 通过 vs 拒绝</span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(20, 20, 30, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                />
                <Bar
                  dataKey="value"
                  fill="#f4d35e"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Chart */}
      <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>每日明细</h2>
          <span className={styles.chartSubtitle}>发帖、通过、拒绝逐日对比</span>
        </div>
        <div className={styles.chartContainer} style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.dailyStats || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(20, 20, 30, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
              />
              <Bar dataKey="posts" stackId="a" fill="#f4d35e" radius={[0, 0, 0, 0]} name="发帖" />
              <Bar dataKey="approved" stackId="a" fill="#48c78e" radius={[0, 0, 0, 0]} name="通过" />
              <Bar dataKey="rejected" stackId="a" fill="#ed6464" radius={[4, 4, 0, 0]} name="拒绝" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.chartLegend}>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#f4d35e' }} />发帖</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#48c78e' }} />通过</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#ed6464' }} />拒绝</span>
        </div>
      </div>
    </div>
  )
}
