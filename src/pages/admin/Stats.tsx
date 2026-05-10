import { useState, useEffect } from 'react'
import { adminApi, AdminStats, MetricsSummary, MetricsTrendPoint, SlowEndpoint } from '../../services/api'
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

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

const ZapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

export function Stats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [metricsSummary, setMetricsSummary] = useState<MetricsSummary | null>(null)
  const [metricsTrend, setMetricsTrend] = useState<MetricsTrendPoint[]>([])
  const [slowEndpoints, setSlowEndpoints] = useState<SlowEndpoint[]>([])
  const [endpointSearch, setEndpointSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    loadMetrics()
  }, [])

  const loadStats = async () => {
    try {
      const result = await adminApi.getStats()
      if (result.success) {
        setStats(result.data)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const loadMetrics = async (search?: string) => {
    try {
      // Get last 7 days range
      const endDate = new Date().toISOString().slice(0, 10)
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const [summaryRes, trendRes, slowRes] = await Promise.all([
        adminApi.getMetricsSummary(startDate, endDate),
        adminApi.getMetricsTrend(startDate, endDate, 'day'),
        adminApi.getSlowEndpoints(startDate, endDate, 10, search || undefined)
      ])

      if (summaryRes.success) setMetricsSummary(summaryRes.data)
      if (trendRes.success) setMetricsTrend(trendRes.data)
      if (slowRes.success) setSlowEndpoints(slowRes.data)
    } catch (err) {
      console.error('Failed to load metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setLoading(true)
    loadMetrics(endpointSearch)
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
    { name: '本周发帖', value: stats?.trends?.postsLast7Days ?? 0, color: 'var(--color-golden)' },
    { name: '本周通过', value: stats?.trends?.approvedLast7Days ?? 0, color: 'var(--color-success)' },
    { name: '本周拒绝', value: stats?.trends?.rejectedLast7Days ?? 0, color: 'var(--color-error)' },
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
                    color: 'var(--color-moonlight)'
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                />
                <Area
                  type="monotone"
                  dataKey="posts"
                  stroke="var(--color-golden)"
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
                    color: 'var(--color-moonlight)'
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                />
                <Bar
                  dataKey="value"
                  fill="var(--color-golden)"
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
                  color: 'var(--color-moonlight)'
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
              />
              <Bar dataKey="posts" stackId="a" fill="var(--color-golden)" radius={[0, 0, 0, 0]} name="发帖" />
              <Bar dataKey="approved" stackId="a" fill="var(--color-success)" radius={[0, 0, 0, 0]} name="通过" />
              <Bar dataKey="rejected" stackId="a" fill="var(--color-error)" radius={[4, 4, 0, 0]} name="拒绝" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.chartLegend}>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: 'var(--color-golden)' }} />发帖</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: 'var(--color-success)' }} />通过</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: 'var(--color-error)' }} />拒绝</span>
        </div>
      </div>

      {/* API Performance Section */}
      <div className={styles.header} style={{ marginTop: 'var(--space-4)' }}>
        <h2 className={styles.title}>接口性能</h2>
        <span className={styles.subtitle}>最近7天 API 响应统计</span>
      </div>

      {/* API Metrics Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} data-color="golden">
            <ZapIcon />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{metricsSummary?.totalRequests?.toLocaleString() ?? 0}</span>
            <span className={styles.metricLabel}>总请求数</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} data-color="blue">
            <ClockIcon />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{Math.round(metricsSummary?.avgDuration ?? 0)}ms</span>
            <span className={styles.metricLabel}>平均耗时</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} data-color="yellow">
            <AlertIcon />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{metricsSummary?.totalSlow?.toLocaleString() ?? 0}</span>
            <span className={styles.metricLabel}>慢请求</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} data-color="red">
            <CloseIcon />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{metricsSummary?.totalErrors?.toLocaleString() ?? 0}</span>
            <span className={styles.metricLabel}>错误请求</span>
          </div>
        </div>
      </div>

      {/* API Response Time Trend */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>响应时间趋势</h2>
            <span className={styles.chartSubtitle}>每日平均响应时间 (ms)</span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={metricsTrend}>
                <defs>
                  <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(20, 20, 30, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'var(--color-moonlight)'
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  formatter={(value) => [`${Math.round(Number(value))}ms`, '平均耗时']}
                />
                <Area
                  type="monotone"
                  dataKey="avgDuration"
                  stroke="var(--color-moonlight)"
                  strokeWidth={2}
                  fill="url(#durationGradient)"
                  name="平均耗时"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Slowest Endpoints Table */}
      <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>最慢接口 TOP 10</h2>
          <span className={styles.chartSubtitle}>按平均响应时间排序（已过滤 OPTIONS）</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <input
            type="text"
            placeholder="搜索接口路径..."
            value={endpointSearch}
            onChange={(e) => setEndpointSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-3)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--color-moonlight)',
              fontSize: 'var(--text-sm)',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'rgba(244,211,94,0.2)',
              border: '1px solid rgba(244,211,94,0.3)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--color-golden)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer'
            }}
          >
            搜索
          </button>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>日期</th>
                <th>接口</th>
                <th>方法</th>
                <th>请求数</th>
                <th>平均耗时</th>
                <th>慢请求</th>
                <th>错误</th>
              </tr>
            </thead>
            <tbody>
              {slowEndpoints.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>暂无数据</td>
                </tr>
              ) : (
                slowEndpoints.map((ep, idx) => (
                  <tr key={`${ep.date}-${ep.endpoint}-${ep.method}-${idx}`}>
                    <td>{ep.date}</td>
                    <td className={styles.endpointCell}>{ep.endpoint}</td>
                    <td>
                      <span className={styles.methodBadge} data-method={ep.method}>
                        {ep.method}
                      </span>
                    </td>
                    <td>{ep.requestCount?.toLocaleString() ?? 0}</td>
                    <td className={styles.durationCell}>{Math.round(ep.avgDuration ?? 0)}ms</td>
                    <td className={ep.slowCount > 0 ? styles.warnCell : ''}>
                      {ep.slowCount?.toLocaleString() ?? 0}
                    </td>
                    <td className={ep.errorCount > 0 ? styles.errorCell : ''}>
                      {ep.errorCount?.toLocaleString() ?? 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
