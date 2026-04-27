import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { OnboardingOverlay } from '../components/ui/OnboardingOverlay'
import { AchievementCenter } from '../components/AchievementCenter'
import { useDreamStore } from '../hooks/useDreamStore'
import styles from './Home.module.css'

export function Home() {
  const { achievements, history } = useDreamStore()
  const [showAchievementCenter, setShowAchievementCenter] = useState(false)
  const handleOnboardingComplete = useCallback(() => {}, [])

  const isNewUser = history.length === 0
  const lastDreamDate = history.length > 0 ? history[0].date : null

  return (
    <div className={styles.page}>
      {/* Achievement Badge */}
      {achievements.length > 0 && (
        <button
          className={styles.achievementBadge}
          onClick={() => setShowAchievementCenter(true)}
          aria-label={`已解锁 ${achievements.length} 个成就`}
        >
          <span className={styles.achievementBadgeIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
          </span>
          <span className={styles.achievementBadgeCount}>{achievements.length}</span>
        </button>
      )}

      <OnboardingOverlay onComplete={handleOnboardingComplete} />
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.moon}>
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="60" fill="url(#moonGradient)" />
            <circle cx="85" cy="85" r="8" fill="rgba(255,255,255,0.3)" />
            <circle cx="110" cy="95" r="5" fill="rgba(255,255,255,0.2)" />
            <circle cx="90" cy="110" r="6" fill="rgba(255,255,255,0.25)" />
            <defs>
              <radialGradient id="moonGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFD666" />
                <stop offset="100%" stopColor="#F4D35E" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <h1 className={styles.heroTitle}>
          {isNewUser ? (
            <>
              <span className={styles.heroTitleLine}>你在夜棂存的</span>
              <span className={styles.heroTitleLine}>每一篇梦</span>
              <span className={styles.heroTitleAccent}>都是你自己</span>
            </>
          ) : (
            <>
              <span className={styles.heroTitleLine}>昨晚做了什么梦？</span>
              <span className={styles.heroTitleAccent}>继续探索吧</span>
            </>
          )}
        </h1>

        <p className={styles.heroSubtitle}>
          {isNewUser
            ? '把醒来就忘的梦，变成能留住的文字'
            : lastDreamDate
              ? `上次记录：${lastDreamDate}`
              : '继续记录你的梦境'}
        </p>

        <div className={styles.heroCta}>
          <Link to="/dream">
            <Button size="lg">
              开始记录
            </Button>
          </Link>
        </div>
      </section>

      {/* Steps Section */}
      <section className={styles.steps}>
        <div className={styles.stepsGrid}>
          <Card className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <svg className={styles.stepIcon} viewBox="0 0 48 48" fill="none">
              <path d="M8 12C8 9.79086 9.79086 8 12 8H36C38.2091 8 40 9.79086 40 12V36C40 38.2091 38.2091 40 36 40H12C9.79086 40 8 38.2091 8 36V12Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 18H34M14 24H28M14 30H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="36" cy="36" r="8" fill="rgba(244, 211, 94, 0.15)" stroke="currentColor" strokeWidth="2"/>
              <path d="M36 33V36L38 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h3 className={styles.stepTitle}>记录碎片</h3>
            <p className={styles.stepDesc}>
              把你记得的梦境片段发给我——场景、人物、情绪，任何你能想起的细节
            </p>
          </Card>

          <Card className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <svg className={styles.stepIcon} viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2"/>
              <path d="M24 16V24L30 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M18 8L20 12L24 10L28 12L30 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 40L16 36L20 38L24 34L28 38L32 36L34 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
            </svg>
            <h3 className={styles.stepTitle}>回答追问</h3>
            <p className={styles.stepDesc}>
              我会问你几个问题，帮助你回忆更多细节，让故事更完整
            </p>
          </Card>

          <Card className={styles.stepCard}>
            <div className={styles.stepNumber}>03</div>
            <svg className={styles.stepIcon} viewBox="0 0 48 48" fill="none">
              <path d="M8 40V12C8 9.79086 9.79086 8 12 8H36C38.2091 8 40 9.79086 40 12V40" stroke="currentColor" strokeWidth="2"/>
              <path d="M40 40L28 28L16 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 16H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="36" cy="12" r="6" fill="rgba(244, 211, 94, 0.2)" stroke="currentColor" strokeWidth="2"/>
              <path d="M36 9V12L38 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <h3 className={styles.stepTitle}>生成故事</h3>
            <p className={styles.stepDesc}>
              基于你的梦境碎片，创作一篇500-800字的完整故事，保留梦的韵味
            </p>
          </Card>
        </div>
      </section>

      {/* Footer Quote */}
      <footer className={styles.footer}>
        <blockquote className={styles.quote}>
          "每个人的梦里都住着另一个自己，那个自己比醒着的更真实、更勇敢、更脆弱。"
        </blockquote>
      </footer>

      <AchievementCenter
        isOpen={showAchievementCenter}
        onClose={() => setShowAchievementCenter(false)}
      />
    </div>
  )
}
