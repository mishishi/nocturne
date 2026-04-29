import { useRef, useCallback, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './ui/Button'
import styles from './SharePoster.module.css'

type TemplateType = 'nightSky' | 'moonlight' | 'starTrail'

interface SharePosterProps {
  storyTitle: string
  story: string
  date?: string
  onClose: () => void
  onShare?: (type: 'poster') => void
}

const TEMPLATES: { id: TemplateType; name: string; icon: string; desc: string }[] = [
  { id: 'nightSky', name: '夜空', icon: '🌌', desc: '深邃星空' },
  { id: 'moonlight', name: '月光', icon: '🌙', desc: '柔和月华' },
  { id: 'starTrail', name: '星迹', icon: '✨', desc: '流光轨迹' },
]

export function SharePoster({ storyTitle, story, date, onClose, onShare }: SharePosterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('nightSky')

  const generatePoster = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 540
    const height = 960
    canvas.width = width
    canvas.height = height

    // Template-specific backgrounds
    if (selectedTemplate === 'nightSky') {
      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#0D1B2A')
      bg.addColorStop(0.5, '#1A3A5C')
      bg.addColorStop(1, '#0D1B2A')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // Decorative circles
      ctx.globalAlpha = 0.1
      ctx.fillStyle = '#F4D35E'
      ctx.beginPath()
      ctx.arc(100, 150, 200, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(440, 800, 180, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Moon
      ctx.fillStyle = '#F4D35E'
      ctx.beginPath()
      ctx.arc(420, 120, 50, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0D1B2A'
      ctx.beginPath()
      ctx.arc(445, 110, 45, 0, Math.PI * 2)
      ctx.fill()

      // Stars
      ctx.fillStyle = '#F4D35E'
      const stars = [
        { x: 80, y: 80, r: 2 }, { x: 200, y: 60, r: 1.5 }, { x: 320, y: 100, r: 2 },
        { x: 150, y: 200, r: 1 }, { x: 500, y: 200, r: 1.5 }, { x: 60, y: 350, r: 1 },
        { x: 480, y: 380, r: 1.5 }, { x: 100, y: 500, r: 1 }, { x: 450, y: 520, r: 1 },
      ]
      stars.forEach(star => {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      })
    } else if (selectedTemplate === 'moonlight') {
      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#1A1A2E')
      bg.addColorStop(0.3, '#16213E')
      bg.addColorStop(0.7, '#1A1A2E')
      bg.addColorStop(1, '#0F0F1A')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // Soft moon glow
      const moonGlow = ctx.createRadialGradient(270, 160, 0, 270, 160, 280)
      moonGlow.addColorStop(0, 'rgba(244, 211, 94, 0.15)')
      moonGlow.addColorStop(0.5, 'rgba(244, 211, 94, 0.05)')
      moonGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = moonGlow
      ctx.fillRect(0, 0, width, height)

      // Large moon
      ctx.fillStyle = '#F4D35E'
      ctx.beginPath()
      ctx.arc(270, 160, 60, 0, Math.PI * 2)
      ctx.fill()

      // Moon inner detail
      ctx.fillStyle = '#E8C547'
      ctx.beginPath()
      ctx.arc(255, 155, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(280, 170, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(260, 175, 6, 0, Math.PI * 2)
      ctx.fill()
    } else if (selectedTemplate === 'starTrail') {
      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#0A0A14')
      bg.addColorStop(0.5, '#12121F')
      bg.addColorStop(1, '#0A0A14')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // Trail lines
      ctx.strokeStyle = 'rgba(244, 211, 94, 0.15)'
      ctx.lineWidth = 1
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * width
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + (Math.random() - 0.5) * 100, height)
        ctx.stroke()
      }

      // Glowing stars
      const trailStars = [
        { x: 100, y: 100, r: 3 }, { x: 200, y: 200, r: 2 }, { x: 350, y: 150, r: 3 },
        { x: 450, y: 300, r: 2 }, { x: 150, y: 400, r: 3 }, { x: 400, y: 450, r: 2 },
        { x: 80, y: 550, r: 3 }, { x: 300, y: 500, r: 2 }, { x: 500, y: 600, r: 3 },
        { x: 200, y: 650, r: 2 }, { x: 350, y: 700, r: 3 }, { x: 120, y: 750, r: 2 },
      ]
      trailStars.forEach(star => {
        const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.r * 4)
        glow.addColorStop(0, 'rgba(244, 211, 94, 0.8)')
        glow.addColorStop(0.5, 'rgba(244, 211, 94, 0.2)')
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r * 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#F4D35E'
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // Title
    ctx.fillStyle = '#F4D35E'
    ctx.font = 'bold 42px "Cormorant Garamond", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText(storyTitle, width / 2, 280)

    // Decorative line under title
    const lineGradient = ctx.createLinearGradient(180, 0, 360, 0)
    lineGradient.addColorStop(0, 'transparent')
    lineGradient.addColorStop(0.5, '#F4D35E')
    lineGradient.addColorStop(1, 'transparent')
    ctx.strokeStyle = lineGradient
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(180, 310)
    ctx.lineTo(360, 310)
    ctx.stroke()

    // Story text (preview - first 300 chars)
    const storyPreview = story.slice(0, 300) + (story.length > 300 ? '...' : '')
    ctx.fillStyle = '#E8E8E8'
    ctx.font = '28px "DM Sans", -apple-system, sans-serif'
    ctx.textAlign = 'left'

    const maxWidth = width - 80
    const lineHeight = 42
    let y = 380
    const words = storyPreview.split('')
    let line = ''

    for (const char of words) {
      const testLine = line + char
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, 40, y)
        line = char
        y += lineHeight
        if (y > height - 200) break
      } else {
        line = testLine
      }
    }
    if (line && y <= height - 200) {
      ctx.fillText(line, 40, y)
    }

    // Bottom decorative elements
    ctx.fillStyle = '#A8B5C9'
    ctx.font = '20px "DM Sans", -apple-system, sans-serif'
    ctx.textAlign = 'center'

    const displayDate = date || new Date().toLocaleDateString('zh-CN')
    ctx.fillText(displayDate, width / 2, height - 100)

    ctx.fillStyle = '#7A8BA5'
    ctx.font = '18px "DM Sans", -apple-system, sans-serif'
    ctx.fillText('— 夜棂 · 梦境记录 —', width / 2, height - 60)

    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#F4D35E'
    ctx.font = '16px "DM Sans", -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('yeelin.app', width - 30, height - 30)
    ctx.globalAlpha = 1
  }, [storyTitle, story, date, selectedTemplate])

  // Generate poster preview when template or content changes
  useEffect(() => {
    // Delay to ensure canvas is rendered
    const timer = setTimeout(() => {
      generatePoster()
    }, 50)
    return () => clearTimeout(timer)
  }, [selectedTemplate, storyTitle, story, date, generatePoster])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    generatePoster()

    setTimeout(() => {
      const link = document.createElement('a')
      link.download = `夜棂-${storyTitle}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      onShare?.('poster')
      onClose()
    }, 100)
  }

  const handleShare = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    generatePoster()

    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )

      if (blob && navigator.share) {
        const file = new File([blob], `夜棂-${storyTitle}.png`, { type: 'image/png' })
        await navigator.share({
          files: [file],
          title: '夜棂 - 梦境故事',
          text: `「${storyTitle}」\n\n${story}`
        })
        onShare?.('poster')
      }
    } catch {
      handleDownload()
      return
    }
    onClose()
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>生成海报</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Template Selection */}
        <div className={styles.templateSection}>
          <span className={styles.templateLabel}>选择风格</span>
          <div className={styles.templateGrid}>
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                className={`${styles.templateCard} ${selectedTemplate === tpl.id ? styles.templateActive : ''}`}
                onClick={() => setSelectedTemplate(tpl.id)}
              >
                <span className={styles.templateIcon}>{tpl.icon}</span>
                <span className={styles.templateName}>{tpl.name}</span>
                <span className={styles.templateDesc}>{tpl.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.preview}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>

        {/* Share Incentive */}
        <div className={styles.incentive}>
          <div className={styles.incentiveContent}>
            <span className={styles.incentiveIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </span>
            <span className={styles.incentiveText}>分享海报可获得 <strong>5</strong> 梦境积分</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button size="lg" onClick={handleDownload} className={styles.downloadBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            保存图片
          </Button>
          {typeof navigator.share === 'function' && (
            <Button size="lg" variant="secondary" onClick={handleShare} className={styles.shareBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              分享海报
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
