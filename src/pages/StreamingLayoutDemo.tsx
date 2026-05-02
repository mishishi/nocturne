import { useState, useEffect } from 'react'
import styles from './StreamingLayoutDemo.module.css'

const DEMO_CONTENT = `月光洒落在古老的石板路上，泛起微微的银色涟漪。远处传来风铃的声响，似乎在诉说着一个久远的梦境。故事从一个宁静的夜晚开始，月光如水般倾泻在小镇的青石板路上，照亮了每一个沉睡的角落。`

// ============ 方案一：沉浸式宽屏 ============
function ImmersiveWide() {
  const [displayed, setDisplayed] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)

  useEffect(() => {
    if (!isActive) return
    if (cursorPos >= DEMO_CONTENT.length) return

    const timer = setTimeout(() => {
      setDisplayed(prev => prev + DEMO_CONTENT[cursorPos])
      setCursorPos(prev => prev + 1)
    }, 60)
    return () => clearTimeout(timer)
  }, [isActive, cursorPos])

  const handleStart = () => {
    setIsActive(true)
    setDisplayed('')
    setCursorPos(0)
  }

  const handleReset = () => {
    setIsActive(false)
    setDisplayed('')
    setCursorPos(0)
  }

  return (
    <div className={styles.effectCard}>
      <h3 className={styles.effectTitle}>方案一：沉浸式宽屏</h3>
      <p className={styles.effectDesc}>95% 宽度，60vh 高度，全屏阅读体验</p>

      <div className={styles.immersiveContainer}>
        <h4 className={styles.immersiveTitle}>《月光》</h4>
        <div className={styles.immersiveContent}>
          <p className={styles.immersiveText}>
            {displayed}
            {cursorPos < DEMO_CONTENT.length && <span className={styles.featherCursor}>🪶</span>}
          </p>
        </div>
        <div className={styles.immersiveCharCount}>
          {displayed.length} 字
        </div>
      </div>

      <div className={styles.controls}>
        <button onClick={handleStart} disabled={isActive} className={styles.startBtn}>开始</button>
        <button onClick={handleReset} disabled={!isActive && !displayed} className={styles.resetBtn}>重置</button>
      </div>
    </div>
  )
}

// ============ 方案二：大气悬浮卡片 ============
function FloatingCard() {
  const [displayed, setDisplayed] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)

  useEffect(() => {
    if (!isActive) return
    if (cursorPos >= DEMO_CONTENT.length) return

    const timer = setTimeout(() => {
      setDisplayed(prev => prev + DEMO_CONTENT[cursorPos])
      setCursorPos(prev => prev + 1)
    }, 60)
    return () => clearTimeout(timer)
  }, [isActive, cursorPos])

  const handleStart = () => {
    setIsActive(true)
    setDisplayed('')
    setCursorPos(0)
  }

  const handleReset = () => {
    setIsActive(false)
    setDisplayed('')
    setCursorPos(0)
  }

  return (
    <div className={styles.effectCard}>
      <h3 className={styles.effectTitle}>方案二：大气悬浮卡片</h3>
      <p className={styles.effectDesc}>固定 800px 宽度，悬浮阴影效果</p>

      <div className={styles.floatingCardContainer}>
        <h4 className={styles.floatingCardTitle}>
          <span className={styles.floatingCardStar}>✦</span>
          《月光》
          <span className={styles.floatingCardStar}>✦</span>
        </h4>
        <div className={styles.floatingCardContent}>
          <p className={styles.floatingCardText}>
            {displayed}
            {cursorPos < DEMO_CONTENT.length && <span className={styles.featherCursor}>🪶</span>}
          </p>
        </div>
        <div className={styles.floatingCardCharCount}>
          {displayed.length} 字
        </div>
      </div>

      <div className={styles.controls}>
        <button onClick={handleStart} disabled={isActive} className={styles.startBtn}>开始</button>
        <button onClick={handleReset} disabled={!isActive && !displayed} className={styles.resetBtn}>重置</button>
      </div>
    </div>
  )
}

// ============ 方案三：全屏铺开 ============
function FullscreenSpread() {
  const [displayed, setDisplayed] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)

  useEffect(() => {
    if (!isActive) return
    if (cursorPos >= DEMO_CONTENT.length) return

    const timer = setTimeout(() => {
      setDisplayed(prev => prev + DEMO_CONTENT[cursorPos])
      setCursorPos(prev => prev + 1)
    }, 60)
    return () => clearTimeout(timer)
  }, [isActive, cursorPos])

  const handleStart = () => {
    setIsActive(true)
    setDisplayed('')
    setCursorPos(0)
  }

  const handleReset = () => {
    setIsActive(false)
    setDisplayed('')
    setCursorPos(0)
  }

  return (
    <div className={styles.effectCard}>
      <h3 className={styles.effectTitle}>方案三：全屏铺开</h3>
      <p className={styles.effectDesc}>100% 宽度，自适应内容，极简阅读</p>

      <div className={styles.fullscreenContainer}>
        <div className={styles.fullscreenHeader}>
          <h4 className={styles.fullscreenTitle}>《月光》</h4>
          <p className={styles.fullscreenSubtitle}>故事正在编织中...</p>
        </div>
        <div className={styles.fullscreenContent}>
          <p className={styles.fullscreenText}>
            {displayed}
            {cursorPos < DEMO_CONTENT.length && <span className={styles.featherCursor}>🪶</span>}
          </p>
        </div>
        <div className={styles.fullscreenCharCount}>
          {displayed.length} 字
        </div>
      </div>

      <div className={styles.controls}>
        <button onClick={handleStart} disabled={isActive} className={styles.startBtn}>开始</button>
        <button onClick={handleReset} disabled={!isActive && !displayed} className={styles.resetBtn}>重置</button>
      </div>
    </div>
  )
}

// ============ 方案四：黄金比例 ============
function GoldenRatio() {
  const [displayed, setDisplayed] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)

  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * 60,
    y: 20 + Math.random() * 60,
    delay: Math.random() * 2
  }))

  useEffect(() => {
    if (!isActive) return
    if (cursorPos >= DEMO_CONTENT.length) return

    const timer = setTimeout(() => {
      setDisplayed(prev => prev + DEMO_CONTENT[cursorPos])
      setCursorPos(prev => prev + 1)
    }, 60)
    return () => clearTimeout(timer)
  }, [isActive, cursorPos])

  const handleStart = () => {
    setIsActive(true)
    setDisplayed('')
    setCursorPos(0)
  }

  const handleReset = () => {
    setIsActive(false)
    setDisplayed('')
    setCursorPos(0)
  }

  return (
    <div className={styles.effectCard}>
      <h3 className={styles.effectTitle}>方案四：黄金比例</h3>
      <p className={styles.effectDesc}>左侧星区 + 右侧内容，不对称美学</p>

      <div className={styles.goldenContainer}>
        <div className={styles.goldenStars}>
          {particles.map(p => (
            <span
              key={p.id}
              className={styles.goldenFirefly}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                animationDelay: `${p.delay}s`
              }}
            />
          ))}
        </div>
        <div className={styles.goldenContent}>
          <h4 className={styles.goldenTitle}>《月光》</h4>
          <div className={styles.goldenTextWrapper}>
            <p className={styles.goldenText}>
              {displayed}
              {cursorPos < DEMO_CONTENT.length && <span className={styles.featherCursor}>🪶</span>}
            </p>
          </div>
          <div className={styles.goldenCharCount}>
            {displayed.length} 字
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <button onClick={handleStart} disabled={isActive} className={styles.startBtn}>开始</button>
        <button onClick={handleReset} disabled={!isActive && !displayed} className={styles.resetBtn}>重置</button>
      </div>
    </div>
  )
}

// ============ 主页面 ============
export function StreamingLayoutDemo() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.mainTitle}>Streaming 布局方案演示</h1>
        <p className={styles.subtitle}>四种布局方案对比，点击「开始」预览效果</p>
      </header>

      <main className={styles.grid}>
        <ImmersiveWide />
        <FloatingCard />
        <FullscreenSpread />
        <GoldenRatio />
      </main>
    </div>
  )
}
