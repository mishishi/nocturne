import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { DreamSession } from '../hooks/useDreamStore'
import styles from './MonthlyDreamBook.module.css'

interface MonthlyDreamBookProps {
  history: DreamSession[]
  onClose: () => void
}

interface MonthGroup {
  year: number
  month: number
  label: string
  dreams: DreamSession[]
}

function groupDreamsByMonth(history: DreamSession[]): MonthGroup[] {
  const groups: Record<string, MonthGroup> = {}

  history.forEach(dream => {
    const date = new Date(dream.date)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    if (!groups[key]) {
      groups[key] = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
        dreams: []
      }
    }
    groups[key].dreams.push(dream)
  })

  return Object.values(groups).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function getEmotionLabel(tags: string[]): string {
  const emotionMap: Record<string, string> = {
    'peaceful': '平静',
    'excited': '兴奋',
    'anxious': '焦虑',
    'scared': '恐惧',
    'sad': '悲伤',
    'joyful': '喜悦',
    'confused': '困惑',
    'nostalgic': '怀念'
  }
  if (tags.length === 0) return '平静'
  return emotionMap[tags[0]] || tags[0]
}

export function MonthlyDreamBook({ history, onClose }: MonthlyDreamBookProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedMonth, setSelectedMonth] = useState<MonthGroup | null>(null)

  const monthGroups = useMemo(() => groupDreamsByMonth(history), [history])

  useEffect(() => {
    if (monthGroups.length > 0 && !selectedMonth) {
      setSelectedMonth(monthGroups[0])
    }
  }, [monthGroups, selectedMonth])

  const generateBook = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !selectedMonth) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 600
    const baseHeight = 900
    const dreamCount = selectedMonth.dreams.length
    const contentHeight = Math.max(600, dreamCount * 120 + 200)
    const height = baseHeight + contentHeight

    canvas.width = width
    canvas.height = height

    // Background
    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, '#0D1B2A')
    bg.addColorStop(0.3, '#1A3A5C')
    bg.addColorStop(0.7, '#1A3A5C')
    bg.addColorStop(1, '#0D1B2A')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Decorative moon
    ctx.fillStyle = '#F4D35E'
    ctx.beginPath()
    ctx.arc(480, 80, 45, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#0D1B2A'
    ctx.beginPath()
    ctx.arc(502, 72, 40, 0, Math.PI * 2)
    ctx.fill()

    // Decorative stars
    ctx.fillStyle = '#F4D35E'
    const stars = [
      { x: 80, y: 60, r: 2 }, { x: 150, y: 40, r: 1.5 }, { x: 280, y: 70, r: 1.5 },
      { x: 50, y: 120, r: 1 }, { x: 350, y: 50, r: 2 }, { x: 420, y: 30, r: 1 }
    ]
    stars.forEach(star => {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
      ctx.fill()
    })

    // Month title
    ctx.fillStyle = '#F4D35E'
    ctx.font = 'bold 36px "Cormorant Garamond", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText(selectedMonth.label, width / 2, 180)

    // Decorative line
    const lineGradient = ctx.createLinearGradient(200, 0, 400, 0)
    lineGradient.addColorStop(0, 'transparent')
    lineGradient.addColorStop(0.5, '#F4D35E')
    lineGradient.addColorStop(1, 'transparent')
    ctx.strokeStyle = lineGradient
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(200, 200)
    ctx.lineTo(400, 200)
    ctx.stroke()

    // Stats row
    const statsY = 250
    const stats = [
      { value: selectedMonth.dreams.length, label: '记录' },
      { value: new Set(selectedMonth.dreams.map(d => d.date)).size, label: '天数' },
      { value: selectedMonth.dreams.filter(d => d.isFavorite).length, label: '收藏' }
    ]

    const statWidth = 100
    const startX = (width - stats.length * statWidth) / 2

    stats.forEach((stat, i) => {
      const x = startX + i * statWidth + statWidth / 2
      ctx.fillStyle = 'rgba(244, 211, 94, 0.1)'
      ctx.beginPath()
      ctx.roundRect(x - 40, statsY, 80, 70, 8)
      ctx.fill()

      ctx.fillStyle = '#F4D35E'
      ctx.font = 'bold 28px "DM Sans", -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(stat.value), x, statsY + 35)

      ctx.fillStyle = '#A8B5C9'
      ctx.font = '12px "DM Sans", -apple-system, sans-serif'
      ctx.fillText(stat.label, x, statsY + 55)
    })

    // Dreams section
    let y = 360
    const maxDreams = Math.min(selectedMonth.dreams.length, 8)

    for (let i = 0; i < maxDreams; i++) {
      const dream = selectedMonth.dreams[i]

      // Dream card background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.beginPath()
      ctx.roundRect(30, y, width - 60, 100, 12)
      ctx.fill()

      // Date badge
      ctx.fillStyle = 'rgba(244, 211, 94, 0.2)'
      ctx.beginPath()
      ctx.roundRect(45, y + 12, 70, 24, 6)
      ctx.fill()

      ctx.fillStyle = '#F4D35E'
      ctx.font = '12px "DM Sans", -apple-system, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(formatDate(dream.date), 55, y + 28)

      // Emotion tag
      const emotion = getEmotionLabel(dream.tags)
      ctx.fillStyle = 'rgba(139, 92, 246, 0.2)'
      ctx.beginPath()
      ctx.roundRect(125, y + 12, 50, 24, 6)
      ctx.fill()

      ctx.fillStyle = '#A78BFA'
      ctx.font = '11px "DM Sans", -apple-system, sans-serif'
      ctx.fillText(emotion, 135, y + 28)

      // Dream title
      ctx.fillStyle = '#E8E8E8'
      ctx.font = '500 16px "DM Sans", -apple-system, sans-serif'
      const title = dream.storyTitle || '无标题'
      const titleText = title.length > 20 ? title.slice(0, 20) + '...' : title
      ctx.fillText(titleText, 45, y + 58)

      // Dream snippet
      ctx.fillStyle = 'rgba(168, 181, 201, 0.7)'
      ctx.font = '13px "DM Sans", -apple-system, sans-serif'
      const snippet = dream.dreamSnippet || ''
      const snippetText = snippet.length > 35 ? snippet.slice(0, 35) + '...' : snippet
      ctx.fillText(snippetText, 45, y + 80)

      y += 115
    }

    if (selectedMonth.dreams.length > 8) {
      ctx.fillStyle = 'rgba(168, 181, 201, 0.5)'
      ctx.font = '13px "DM Sans", -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`...还有 ${selectedMonth.dreams.length - 8} 个梦境`, width / 2, y + 20)
      y += 40
    }

    // Bottom branding
    ctx.fillStyle = '#7A8BA5'
    ctx.font = '16px "DM Sans", -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('— 夜棂 · 月度梦境手册 —', width / 2, height - 60)

    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#F4D35E'
    ctx.font = '14px "DM Sans", -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('yeelin.app', width - 30, height - 30)
    ctx.globalAlpha = 1
  }, [selectedMonth])

  useEffect(() => {
    if (selectedMonth) {
      const timer = setTimeout(generateBook, 50)
      return () => clearTimeout(timer)
    }
  }, [selectedMonth, generateBook])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas || !selectedMonth) return

    generateBook()

    setTimeout(() => {
      const link = document.createElement('a')
      link.download = `夜棂-${selectedMonth.label}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      onClose()
    }, 100)
  }

  if (monthGroups.length === 0) {
    return createPortal(
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.header}>
            <h3 className={styles.title}>月度梦境手册</h3>
            <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
              <path d="M12 6v6l4 2" />
            </svg>
            <p className={styles.emptyText}>记录更多梦境，生成你的专属月度手册</p>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>月度梦境手册</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.monthSelector}>
          <span className={styles.monthSelectorLabel}>选择月份</span>
          <div className={styles.monthGrid}>
            {monthGroups.map(group => (
              <button
                key={`${group.year}-${group.month}`}
                className={`${styles.monthCard} ${selectedMonth?.year === group.year && selectedMonth?.month === group.month ? styles.selected : ''}`}
                onClick={() => setSelectedMonth(group)}
              >
                <span className={styles.monthName}>{group.month}月</span>
                <span className={styles.monthYear}>{group.year}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.preview}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>

        <div className={styles.actions}>
          <button className={`${styles.actionBtn} ${styles.downloadBtn}`} onClick={handleDownload}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            保存图片
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
