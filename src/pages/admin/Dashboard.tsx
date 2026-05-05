import { useState, useEffect } from 'react'
import { adminApi, AdminStats } from '../../services/api'
import { Toast } from '../../components/ui/Toast'
import styles from './Admin.module.css'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts'
import stylesChart from './Dashboard.module.css'

// SVG Icons
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const DocumentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

const TrendingUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const TrendingDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
)

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={stylesChart.tooltip}>
        <p className={stylesChart.tooltipLabel}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className={stylesChart.tooltipValue} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Custom label for pie chart
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={500}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
  }

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
      showToast('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const postsGrowth = stats?.trends?.postsGrowth ?? 0
  const isGrowthPositive = postsGrowth >= 0

  // Prepare pie chart data
  const pieData = stats ? [
    { name: '待审核', value: stats.pendingPosts, color: '#F4D35E' },
    { name: '已通过', value: stats.trends?.approvedLast7Days || 0, color: '#48c78e' },
    { name: '已拒绝', value: stats.trends?.rejectedLast7Days || 0, color: '#ed6464' }
  ].filter(d => d.value > 0) : []

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>加载中...</span>
      </div>
    )
  }

  return (
    <div className={stylesChart.dashboard}>
      {/* Key Metrics Cards */}
      <div className={stylesChart.metricsGrid}>
        <div className={stylesChart.metricCard}>
          <div className={stylesChart.metricIcon} style={{ background: 'rgba(244, 211, 94, 0.15)' }}>
            <CheckCircleIcon />
          </div>
          <div className={stylesChart.metricContent}>
            <div className={stylesChart.metricValue}>{stats?.pendingPosts ?? '-'}</div>
            <div className={stylesChart.metricLabel}>待审核帖子</div>
          </div>
        </div>

        <div className={stylesChart.metricCard}>
          <div className={stylesChart.metricIcon} style={{ background: 'rgba(72, 199, 142, 0.15)' }}>
            <DocumentIcon />
          </div>
          <div className={stylesChart.metricContent}>
            <div className={stylesChart.metricValue}>{stats?.totalPosts ?? '-'}</div>
            <div className={stylesChart.metricLabel}>总帖子数</div>
          </div>
        </div>

        <div className={stylesChart.metricCard}>
          <div className={stylesChart.metricIcon} style={{ background: 'rgba(168, 181, 201, 0.15)' }}>
            <ChatIcon />
          </div>
          <div className={stylesChart.metricContent}>
            <div className={stylesChart.metricValue}>{stats?.totalComments ?? '-'}</div>
            <div className={stylesChart.metricLabel}>总评论数</div>
          </div>
        </div>

        <div className={stylesChart.metricCard}>
          <div className={stylesChart.metricIcon} style={{
            background: isGrowthPositive ? 'rgba(72, 199, 142, 0.15)' : 'rgba(237, 100, 100, 0.15)'
          }}>
            {isGrowthPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
          </div>
          <div className={stylesChart.metricContent}>
            <div className={stylesChart.metricValue} style={{
              color: isGrowthPositive ? '#48c78e' : '#ed6464'
            }}>
              <span aria-hidden="true">{isGrowthPositive ? '↑' : '↓'}</span>
              <span className="sr-only">{isGrowthPositive ? '上升' : '下降'}</span>
              {isGrowthPositive ? '+' : ''}{postsGrowth}%
            </div>
            <div className={stylesChart.metricLabel}>增长率</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={stylesChart.chartsGrid}>
        {/* Daily Activity Bar Chart */}
        <div className={stylesChart.chartCard}>
          <h3 className={stylesChart.chartTitle}>7天审核动态</h3>
          <div
            className={stylesChart.chartContainer}
            role="img"
            aria-label="7天审核动态柱状图，展示每天的通过和拒绝数量"
          >
            {stats?.dailyStats && stats.dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.dailyStats} barCategoryGap="30%">
                  <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#7A8BA5', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#7A8BA5', fontSize: 11 }}
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="approved" name="通过" fill="#48c78e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" name="拒绝" fill="#ed6464" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={stylesChart.noData}>暂无数据</div>
            )}
          </div>
        </div>

        {/* Post Distribution Pie Chart */}
        <div className={stylesChart.chartCard}>
          <h3 className={stylesChart.chartTitle}>帖子分布</h3>
          <div
            className={stylesChart.chartContainer}
            role="img"
            aria-label={`帖子分布饼图：待审核 ${stats?.pendingPosts ?? 0}，已通过 ${stats?.trends?.approvedLast7Days ?? 0}，已拒绝 ${stats?.trends?.rejectedLast7Days ?? 0}`}
          >
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={<CustomPieLabel />}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={stylesChart.noData}>暂无数据</div>
            )}
            <div className={stylesChart.legend}>
              {pieData.map((entry, index) => (
                <div key={index} className={stylesChart.legendItem}>
                  <span className={stylesChart.legendDot} style={{ background: entry.color }} />
                  <span className={stylesChart.legendLabel}>{entry.name}</span>
                  <span className={stylesChart.legendValue}>{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className={stylesChart.statsRow}>
        <div className={stylesChart.statItem}>
          <span className={stylesChart.statValue}>{stats?.trends?.postsLast7Days ?? 0}</span>
          <span className={stylesChart.statLabel}>7天新增帖子</span>
        </div>
        <div className={stylesChart.statDivider} />
        <div className={stylesChart.statItem}>
          <span className={stylesChart.statValue} style={{ color: '#48c78e' }}>{stats?.trends?.approvedLast7Days ?? 0}</span>
          <span className={stylesChart.statLabel}>7天通过</span>
        </div>
        <div className={stylesChart.statDivider} />
        <div className={stylesChart.statItem}>
          <span className={stylesChart.statValue} style={{ color: '#ed6464' }}>{stats?.trends?.rejectedLast7Days ?? 0}</span>
          <span className={stylesChart.statLabel}>7天拒绝</span>
        </div>
      </div>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
    </div>
  )
}
