import { useState, useEffect } from 'react'
import styles from './StreamingEffectsDemo.module.css'

const DEMO_CONTENT = `月光洒落在古老的石板路上，泛起微微的银色涟漪。远处传来风铃的声响，似乎在诉说着一个久远的梦境。`

// ============ 方案一：古典书卷 ============
function ClassicalScroll() {
  const [displayed, setDisplayed] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)

  useEffect(() => {
    if (!isActive) return
    if (cursorPos >= DEMO_CONTENT.length) return

    const timer = setTimeout(() => {
      setDisplayed(prev => prev + DEMO_CONTENT[cursorPos])
      setCursorPos(prev => prev + 1)
    }, 80)
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
      <h3 className={styles.effectTitle}>方案一：古典书卷</h3>
      <p className={styles.effectDesc}>墨迹晕染效果，古典书卷质感</p>

      <div className={styles.classicalContainer}>
        <div className={styles.scrollBackground}>
          <div className={styles.scrollEdgeTop} />
          <div className={styles.scrollContent}>
            <h4 className={styles.scrollTitle}>《月光》</h4>
            <div className={styles.scrollText}>
              {displayed}
              {cursorPos < DEMO_CONTENT.length && <span className={styles.inkDrop} />}
            </div>
          </div>
          <div className={styles.scrollEdgeBottom} />
        </div>
        <div className={styles.inkSplash} />
      </div>

      <div className={styles.controls}>
        <button onClick={handleStart} disabled={isActive} className={styles.startBtn}>开始</button>
        <button onClick={handleReset} disabled={!isActive && !displayed} className={styles.resetBtn}>重置</button>
      </div>
    </div>
  )
}

// ============ 方案二：星空织锦 ============
function StarryBrocade() {
  const [displayed, setDisplayed] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])
  const [threads, setThreads] = useState<Array<{ id: number; y: number }>>([])

  useEffect(() => {
    if (!isActive) return
    if (cursorPos >= DEMO_CONTENT.length) return

    const timer = setTimeout(() => {
      setDisplayed(prev => prev + DEMO_CONTENT[cursorPos])
      setCursorPos(prev => prev + 1)

      // Add golden thread line
      if (DEMO_CONTENT[cursorPos] === '。' || DEMO_CONTENT[cursorPos] === '，') {
        setThreads(prev => [...prev, { id: Date.now(), y: Math.random() * 60 + 20 }])
      }
    }, 80)
    return () => clearTimeout(timer)
  }, [isActive, cursorPos])

  useEffect(() => {
    if (isActive) {
      const newParticles = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2
      }))
      setParticles(newParticles)
    }
  }, [isActive])

  const handleStart = () => {
    setIsActive(true)
    setDisplayed('')
    setCursorPos(0)
    setParticles([])
    setThreads([])
  }

  const handleReset = () => {
    setIsActive(false)
    setDisplayed('')
    setCursorPos(0)
    setParticles([])
    setThreads([])
  }

  return (
    <div className={styles.effectCard}>
      <h3 className={styles.effectTitle}>方案二：星空织锦</h3>
      <p className={styles.effectDesc}>星辰丝线织入夜空，刺绣效果</p>

      <div className={styles.brocadeContainer}>
        <div className={styles.starryBackground}>
          {particles.map(p => (
            <span
              key={p.id}
              className={styles.firefly}
              style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.delay}s` }}
            />
          ))}
        </div>
        <div className={styles.brocadeFrame}>
          <h4 className={styles.brocadeTitle}>
            <span className={styles.brocadeStar}>✦</span>
            《月光》
            <span className={styles.brocadeStar}>✦</span>
          </h4>
          <div className={styles.brocadeText}>
            {threads.map(t => (
              <div key={t.id} className={styles.goldenThread} style={{ top: `${t.y}%` }} />
            ))}
            <span className={styles.brocadeContent}>{displayed}</span>
            {cursorPos < DEMO_CONTENT.length && (
              <span className={styles.featherCursor}>🪶</span>
            )}
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

// ============ 方案三：梦境涟漪 ============
function DreamRipple() {
  const [displayed, setDisplayed] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])

  useEffect(() => {
    if (!isActive) return
    if (cursorPos >= DEMO_CONTENT.length) return

    const timer = setTimeout(() => {
      setDisplayed(prev => prev + DEMO_CONTENT[cursorPos])
      setCursorPos(prev => prev + 1)

      // Add ripple effect for punctuation
      if (DEMO_CONTENT[cursorPos] === '。' || DEMO_CONTENT[cursorPos] === '，') {
        setRipples(prev => [...prev.slice(-3), {
          id: Date.now(),
          x: 20 + Math.random() * 60,
          y: 70 + Math.random() * 20
        }])
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [isActive, cursorPos])

  const handleStart = () => {
    setIsActive(true)
    setDisplayed('')
    setCursorPos(0)
    setRipples([])
  }

  const handleReset = () => {
    setIsActive(false)
    setDisplayed('')
    setCursorPos(0)
    setRipples([])
  }

  return (
    <div className={styles.effectCard}>
      <h3 className={styles.effectTitle}>方案三：梦境涟漪</h3>
      <p className={styles.effectDesc}>水波扩散效果，如湖面呈现倒影</p>

      <div className={styles.rippleContainer}>
        <div className={styles.lakeBackground}>
          {/* Water ripples */}
          {ripples.map(r => (
            <div
              key={r.id}
              className={styles.ripple}
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
            />
          ))}

          {/* Lotus leaves */}
          <span className={styles.lotus} style={{ left: '10%', bottom: '15%' }}>🪷</span>
          <span className={styles.lotus} style={{ right: '15%', bottom: '20%' }}>🍃</span>

          <div className={styles.lakeContent}>
            <h4 className={styles.lakeTitle}>《月光》</h4>
            <div className={styles.lakeText}>
              {displayed}
              {cursorPos < DEMO_CONTENT.length && (
                <span className={styles.rippleCursor}>
                  <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
                </span>
              )}
            </div>
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
export function StreamingEffectsDemo() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.mainTitle}>Streaming 效果演示</h1>
        <p className={styles.subtitle}>三种故事文字展现形式，点击「开始」预览动画效果</p>
      </header>

      <main className={styles.grid}>
        <ClassicalScroll />
        <StarryBrocade />
        <DreamRipple />
      </main>

      <div className={styles.footer}>
        <p>测试内容：{DEMO_CONTENT}</p>
      </div>
    </div>
  )
}
