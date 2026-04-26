import { useMemo } from 'react'
import { DreamSession } from '../hooks/useDreamStore'
import styles from './Statistics.module.css'

interface StatisticsProps {
  history: DreamSession[]
}

export function Statistics({ history }: StatisticsProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    if (history.length === 0) return null

    // Dream frequency by day of week
    const dayStats = [0, 0, 0, 0, 0, 0, 0] // Sun-Sat
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

    // Dream frequency by hour (0-23)
    const hourStats = new Array(24).fill(0)

    // Monthly trend (last 6 months)
    const monthlyStats: { month: string; count: number }[] = []

    // Average story length
    let totalWords = 0

    // Streak tracking
    let currentStreak = 0
    let longestStreak = 0

    // Parse dates and calculate stats
    const sortedHistory = [...history].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Calculate day stats and find streaks
    const dateSet = new Set<string>()
    let tempStreak = 0

    sortedHistory.forEach((item) => {
      const date = new Date(item.date)
      date.setHours(0, 0, 0, 0)

      // Day of week
      const day = date.getDay()
      dayStats[day]++

      // Hour
      hourStats[date.getHours()]++

      // Total words
      totalWords += item.story.length

      // Track unique dates
      const dateStr = date.toLocaleDateString('zh-CN')
      dateSet.add(dateStr)
    })

    // Sort dates for streak calculation
    const sortedDates = [...dateSet].sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    )

    // Calculate streaks
    let checkDate = new Date(today)
    for (const dateStr of sortedDates) {
      const date = new Date(dateStr)
      date.setHours(0, 0, 0, 0)

      const diffDays = Math.floor((checkDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays <= 1) {
        tempStreak++
        checkDate = date
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak
        tempStreak = 1
        checkDate = date
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak
    currentStreak = tempStreak

    // Monthly stats (last 6 months)
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthStr = date.toLocaleDateString('zh-CN', { month: 'short' })
      const count = history.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate.getMonth() === date.getMonth() &&
               itemDate.getFullYear() === date.getFullYear()
      }).length
      monthlyStats.push({ month: monthStr, count })
    }

    // Peak hours
    const peakHour = hourStats.indexOf(Math.max(...hourStats))
    const peakHourFormatted = `${peakHour.toString().padStart(2, '0')}:00 - ${((peakHour + 1) % 24).toString().padStart(2, '0')}:00`

    // Favorite day
    const favoriteDayIndex = dayStats.indexOf(Math.max(...dayStats))
    const favoriteDay = dayNames[favoriteDayIndex]

    return {
      totalDreams: history.length,
      totalWords,
      avgWordsPerDream: Math.round(totalWords / history.length),
      currentStreak,
      longestStreak,
      peakHour: peakHourFormatted,
      favoriteDay,
      dayStats: dayNames.map((name, i) => ({ name, count: dayStats[i] })),
      monthlyStats
    }
  }, [history])

  if (!stats) return null

  const maxDayCount = Math.max(...stats.dayStats.map(d => d.count), 1)
  const maxMonthlyCount = Math.max(...stats.monthlyStats.map(m => m.count), 1)

  return (
    <div className={styles.container}>
      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{stats.totalDreams}</span>
          <span className={styles.summaryLabel}>梦境总数</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{stats.avgWordsPerDream}</span>
          <span className={styles.summaryLabel}>平均字数</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{stats.longestStreak}</span>
          <span className={styles.summaryLabel}>最长连续</span>
        </div>
      </div>

      {/* Weekly Pattern */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          一周分布
        </h4>
        <div className={styles.weekChart}>
          {stats.dayStats.map((day, i) => (
            <div key={i} className={styles.dayColumn}>
              <div className={styles.dayBarWrapper}>
                <div
                  className={styles.dayBar}
                  style={{ height: `${(day.count / maxDayCount) * 100}%` }}
                  aria-label={`${day.name}: ${day.count} 个梦境`}
                />
              </div>
              <span className={styles.dayName}>{day.name}</span>
            </div>
          ))}
        </div>
        <p className={styles.insight}>最喜欢在 {stats.favoriteDay} 记录梦境</p>
      </div>

      {/* Monthly Trend */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          月度趋势
        </h4>
        <div className={styles.monthChart}>
          {stats.monthlyStats.map((month, i) => (
            <div key={i} className={styles.monthColumn}>
              <div className={styles.monthBarWrapper}>
                <span className={styles.monthValue}>{month.count}</span>
                <div
                  className={styles.monthBar}
                  style={{ height: `${(month.count / maxMonthlyCount) * 100}%` }}
                  aria-label={`${month.month}: ${month.count} 个梦境`}
                />
              </div>
              <span className={styles.monthName}>{month.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className={styles.quickStats}>
        <div className={styles.quickStat}>
          <span className={styles.quickStatIcon}>🔥</span>
          <span className={styles.quickStatLabel}>当前连续</span>
          <span className={styles.quickStatValue}>{stats.currentStreak} 天</span>
        </div>
        <div className={styles.quickStat}>
          <span className={styles.quickStatIcon}>⏰</span>
          <span className={styles.quickStatLabel}>活跃时段</span>
          <span className={styles.quickStatValue}>{stats.peakHour}</span>
        </div>
        <div className={styles.quickStat}>
          <span className={styles.quickStatIcon}>📝</span>
          <span className={styles.quickStatLabel}>累计文字</span>
          <span className={styles.quickStatValue}>{stats.totalWords.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
