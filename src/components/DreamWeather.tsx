import { useState, useEffect } from 'react'
import { useDreamStore, DreamSession } from '../hooks/useDreamStore'
import styles from './DreamWeather.module.css'

interface WeatherType {
  id: string
  icon: string
  label: string
  description: string
  color: string
}

// Weather types mapped from dream emotions
const WEATHER_TYPES: Record<string, WeatherType> = {
  peaceful: {
    id: 'peaceful',
    icon: '🌤️',
    label: '晴朗',
    description: '心境平和',
    color: '#64D8CB'
  },
  adventure: {
    id: 'adventure',
    icon: '🌪️',
    label: '风暴',
    description: '充满冒险',
    color: '#F4A261'
  },
  mystery: {
    id: 'mystery',
    icon: '🌙',
    label: '朦胧',
    description: '神秘莫测',
    color: '#9B7EBD'
  },
  nightmare: {
    id: 'nightmare',
    icon: '⛈️',
    label: '雷雨',
    description: '电闪雷鸣',
    color: '#E76F51'
  },
  joyful: {
    id: 'joyful',
    icon: '✨',
    label: '流星',
    description: '美好欢愉',
    color: '#F4D35E'
  },
  fantasy: {
    id: 'fantasy',
    icon: '🌈',
    label: '彩虹',
    description: '奇幻绚烂',
    color: '#A8DADC'
  }
}

// Calculate dominant mood from dream sessions
function calculateDominantWeather(sessions: DreamSession[]): WeatherType {
  if (sessions.length === 0) {
    return WEATHER_TYPES.peaceful
  }

  // Count tag occurrences
  const tagCounts: Record<string, number> = {}

  sessions.forEach(session => {
    const tags = session.tags || []
    tags.forEach(tagId => {
      tagCounts[tagId] = (tagCounts[tagId] || 0) + 1
    })
  })

  // Find most common tag
  let maxCount = 0
  let dominantTag = 'peaceful'

  Object.entries(tagCounts).forEach(([tagId, count]) => {
    if (count > maxCount) {
      maxCount = count
      dominantTag = tagId
    }
  })

  // Also consider story content for extra fun
  const allText = sessions.map(s => s.story.toLowerCase()).join(' ')

  // Check for keywords that might indicate weather in dreams
  if (allText.includes('雨') || allText.includes('rain')) {
    return WEATHER_TYPES.nightmare
  }
  if (allText.includes('星') || allText.includes('star') || allText.includes('天空')) {
    return WEATHER_TYPES.fantasy
  }

  return WEATHER_TYPES[dominantTag] || WEATHER_TYPES.peaceful
}

export function DreamWeather() {
  const { history } = useDreamStore()
  const [weather, setWeather] = useState<WeatherType>(WEATHER_TYPES.peaceful)
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (history.length > 0) {
      const dominant = calculateDominantWeather(history)
      setWeather(dominant)
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [history])

  if (!isVisible) return null

  return (
    <div
      className={`${styles.weatherWidget} ${isExpanded ? styles.expanded : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setIsExpanded(!isExpanded)
        }
      }}
      aria-expanded={isExpanded}
      aria-label={`梦境天气：${weather.label}`}
    >
      <div className={styles.currentWeather}>
        <span className={styles.weatherIcon}>{weather.icon}</span>
        <div className={styles.weatherInfo}>
          <span className={styles.weatherLabel}>{weather.label}</span>
          <span className={styles.weatherDesc}>{weather.description}</span>
        </div>
        <svg
          className={`${styles.expandIcon} ${isExpanded ? styles.rotated : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isExpanded && (
        <div className={styles.weatherDetails}>
          <div className={styles.detailsHeader}>
            <span>梦境天气</span>
            <span className={styles.dreamCount}>基于 {history.length} 个梦境</span>
          </div>
          <div className={styles.weatherGrid}>
            {Object.values(WEATHER_TYPES).map(w => (
              <div
                key={w.id}
                className={`${styles.weatherItem} ${weather.id === w.id ? styles.active : ''}`}
                style={{ '--weather-color': w.color } as React.CSSProperties}
              >
                <span className={styles.itemIcon}>{w.icon}</span>
                <span className={styles.itemLabel}>{w.label}</span>
              </div>
            ))}
          </div>
          <p className={styles.weatherHint}>
            {history.length >= 5
              ? '继续记录梦境，探索天气变化'
              : '记录更多梦境，解锁完整天气图谱'}
          </p>
        </div>
      )}
    </div>
  )
}
