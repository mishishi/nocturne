import { useMemo } from 'react'
import { DREAM_TAGS, type DreamSession } from '../hooks/useDreamStore'
import styles from './DreamTrendReport.module.css'

interface DreamTrendReportProps {
  history: DreamSession[]
}

// 分析梦境数据提取趋势
function analyzeDreamTrends(history: DreamSession[]) {
  if (history.length === 0) {
    return null
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // 最近30天的梦境
  const recentDreams = history.filter(h => new Date(h.date) >= thirtyDaysAgo)

  // 最近7天的梦境
  const weekDreams = history.filter(h => new Date(h.date) >= sevenDaysAgo)

  // 统计标签频率
  const tagCounts: Record<string, number> = {}
  recentDreams.forEach(dream => {
    dream.tags?.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })

  // 排序标签
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tagId, count]) => {
      const tagInfo = DREAM_TAGS.find(t => t.id === tagId)
      return {
        id: tagId,
        label: tagInfo?.label || tagId,
        count,
        color: tagInfo?.color || '#888'
      }
    })

  // 计算连续记录天数
  const sortedDates = [...new Set(history.map(h => h.date))].sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  )

  let consecutiveDays = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < sortedDates.length; i++) {
    const dreamDate = new Date(sortedDates[i])
    dreamDate.setHours(0, 0, 0, 0)

    const expectedDate = new Date(today)
    expectedDate.setDate(today.getDate() - i)

    if (dreamDate.getTime() === expectedDate.getTime()) {
      consecutiveDays++
    } else if (i === 0) {
      // 今天没记，看昨天
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      if (dreamDate.getTime() === yesterday.getTime()) {
        consecutiveDays++
      } else {
        break
      }
    } else {
      break
    }
  }

  // 提取高频关键词（从 dreamSnippet 中）
  const keywordPatterns = [
    '水', '火', '天空', '大地', '森林', '城市', '房间', '学校',
    '追逐', '飞翔', '坠落', '迷路', '考试', '朋友', '家人',
    '童年', '过去', '未来', '死亡', '重生', '怪物', '动物',
    '车', '路', '桥', '门', '窗', '楼梯'
  ]

  const keywordCounts: Record<string, number> = {}
  recentDreams.forEach(dream => {
    const text = (dream.dreamSnippet + ' ' + dream.story).toLowerCase()
    keywordPatterns.forEach(keyword => {
      if (text.includes(keyword)) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1
      }
    })
  })

  const topKeywords = Object.entries(keywordCounts)
    .filter(([_, count]) => count >= 2) // 至少出现2次
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // 本周 vs 上周
  const thisWeekStart = new Date(sevenDaysAgo)
  const lastWeekStart = new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000)

  const thisWeekCount = weekDreams.length
  const lastWeekCount = history.filter(h => {
    const d = new Date(h.date)
    return d >= lastWeekStart && d < thisWeekStart
  }).length

  const weekChange = lastWeekCount === 0
    ? (thisWeekCount > 0 ? 100 : 0)
    : Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)

  return {
    totalDreams: history.length,
    recentDreams: recentDreams.length,
    weekDreams: thisWeekCount,
    lastWeekDreams: lastWeekCount,
    weekChange,
    consecutiveDays,
    topTags,
    topKeywords,
    hasEnoughData: recentDreams.length >= 3 // 至少3个梦境才显示报告
  }
}

export function DreamTrendReport({ history }: DreamTrendReportProps) {
  const trends = useMemo(() => analyzeDreamTrends(history), [history])

  if (!trends || !trends.hasEnoughData) {
    return null
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return '↑'
    if (change < 0) return '↓'
    return '→'
  }

  const getTrendClass = (change: number) => {
    if (change > 0) return styles.trendUp
    if (change < 0) return styles.trendDown
    return styles.trendSame
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-4 4 4 5-6" />
          </svg>
          梦境趋势
        </h3>
        <span className={styles.subtitle}>近30天</span>
      </div>

      {/* 本周 vs 上周 */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{trends.weekDreams}</span>
          <span className={styles.statLabel}>本周</span>
          <span className={`${styles.statChange} ${getTrendClass(trends.weekChange)}`}>
            {getTrendIcon(trends.weekChange)} {Math.abs(trends.weekChange)}%
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{trends.consecutiveDays}</span>
          <span className={styles.statLabel}>连续天数</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{trends.recentDreams}</span>
          <span className={styles.statLabel}>近30天</span>
        </div>
      </div>

      {/* 情绪分布 */}
      {trends.topTags.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>高频情绪</h4>
          <div className={styles.tagList}>
            {trends.topTags.map(tag => (
              <div
                key={tag.id}
                className={styles.tagItem}
                style={{ '--tag-color': tag.color } as React.CSSProperties}
              >
                <span className={styles.tagLabel}>{tag.label}</span>
                <span className={styles.tagCount}>{tag.count}次</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 主题关键词 */}
      {trends.topKeywords.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>反复出现的主题</h4>
          <div className={styles.keywordList}>
            {trends.topKeywords.map(([keyword, count]) => (
              <span key={keyword} className={styles.keyword}>
                {keyword} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 洞察文案 */}
      <div className={styles.insight}>
        {trends.consecutiveDays >= 7 ? (
          <p>太棒了！你已经连续记录 {trends.consecutiveDays} 天，养成了很好的习惯。</p>
        ) : trends.consecutiveDays >= 3 ? (
          <p>继续保持！你已经连续记录 {trends.consecutiveDays} 天。</p>
        ) : trends.topTags.length > 0 ? (
          <p>最近你似乎经常梦到「{trends.topTags[0].label}」相关的场景。</p>
        ) : (
          <p>记录更多梦境，发现你的梦境规律。</p>
        )}
      </div>
    </div>
  )
}
