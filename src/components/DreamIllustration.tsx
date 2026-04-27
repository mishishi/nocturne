import { useState } from 'react'
import styles from './DreamIllustration.module.css'

interface DreamIllustrationProps {
  storyTitle?: string
  story?: string
  onGenerate?: () => void
  isGenerating?: boolean
}

export function DreamIllustration({ story: _story, storyTitle: _storyTitle, onGenerate, isGenerating }: DreamIllustrationProps) {
  const [_isHovered, setIsHovered] = useState(false)

  // Extract keywords from story for display
  const keywords = extractKeywords(_story || '')

  return (
    <div
      className={styles.illustration}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background gradient */}
      <div className={styles.bgGradient} />

      {/* Moon glow effect */}
      <div className={styles.moonGlow} />

      {/* Crescent moon */}
      <div className={styles.crescentMoon}>
        <div className={styles.moonCircle} />
        <div className={styles.moonShadow} />
      </div>

      {/* Stars */}
      <div className={styles.stars}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={styles.star} />
        ))}
      </div>

      {/* Drifting clouds */}
      <div className={styles.cloud} />
      <div className={styles.cloud} />

      {/* Keywords tags */}
      {keywords.length > 0 && (
        <div className={styles.tags}>
          {keywords.slice(0, 3).map((keyword, i) => (
            <span key={i} className={styles.tag}>
              <span className={styles.tagIcon}>✦</span>
              {keyword}
            </span>
          ))}
        </div>
      )}

      {/* Watermark */}
      <div className={styles.watermark}>
        <svg className={styles.watermarkIcon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
        </svg>
        <span className={styles.watermarkText}>夜棂</span>
      </div>

      {/* Generate button overlay */}
      {onGenerate && (
        <div className={styles.generateOverlay}>
          <button
            className={styles.generateBtn}
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                生成中...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                生成插图
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// Extract meaningful keywords from story text
function extractKeywords(story: string): string[] {
  if (!story) return []

  // Common dream-related keywords to look for
  const keywordPatterns = [
    // Emotions
    '恐惧', '害怕', '焦虑', '悲伤', '快乐', '愤怒', '喜悦', '孤独', '困惑', '迷茫',
    // Environments
    '天空', '海洋', '森林', '城市', '乡村', '房间', '街道', '走廊', '楼梯', '山', '河流', '湖',
    // Objects
    '镜子', '门', '窗', '钥匙', '书', '照片', '衣服', '鞋子', '汽车', '火车',
    // People
    '父母', '母亲', '父亲', '朋友', '老师', '陌生人', '孩子', '老人',
    // Abstract
    '追逐', '飞翔', '坠落', '游泳', '行走', '奔跑', '等待', '寻找',
    // Weather/Time
    '夜晚', '白天', '黎明', '黄昏', '雨', '雪', '风', '雾'
  ]

  const found: string[] = []

  for (const keyword of keywordPatterns) {
    if (story.includes(keyword) && !found.includes(keyword)) {
      found.push(keyword)
      if (found.length >= 3) break
    }
  }

  return found
}
