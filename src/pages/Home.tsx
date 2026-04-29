import { useCallback, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { OnboardingOverlay } from '../components/ui/OnboardingOverlay'
import { AchievementCenter } from '../components/AchievementCenter'
import { useDreamStore, ACHIEVEMENTS, type DreamSession } from '../hooks/useDreamStore'
import styles from './Home.module.css'

const LAST_VISIT_KEY = 'yeelin_last_visit'

export function Home() {
  const { achievements, history, user, currentSession } = useDreamStore()
  const [showAchievementCenter, setShowAchievementCenter] = useState(false)
  const [isReturningUser, setIsReturningUser] = useState(false)
  const handleOnboardingComplete = useCallback(() => {}, [])

  // Detect returning user (has visited before, not same day)
  useEffect(() => {
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY)
    const today = new Date().toDateString()
    if (lastVisit && lastVisit !== today && history.length > 0) {
      setIsReturningUser(true)
    }
    localStorage.setItem(LAST_VISIT_KEY, today)
  }, [history.length])

  const isNewUser = history.length === 0
  const lastDreamDate = history.length > 0 ? history[0].date : null

  // Compute "left off" message from currentSession
  const getLeftOffMessage = () => {
    const { status, questions, currentQuestionIndex, dreamText } = currentSession

    if (status === 'idle' || status === 'completed') return null

    if (status === 'dream_submitted' || (dreamText && questions.length === 0)) {
      return '上次停在了：等待生成问题'
    }

    if (status === 'questions' || status === 'answering' || status === 'story_generating') {
      if (questions.length > 0) {
        return `上次停在了：追问 ${currentQuestionIndex + 1}/${questions.length}`
      }
      return '上次停在了：追问中'
    }

    return null
  }

  const leftOffMessage = getLeftOffMessage()

  // Sample stories for new users
  const sampleStories = [
    {
      title: '坠落的孩子',
      excerpt: '我站在一座没有尽头的楼梯上，每走一步，台阶就在脚下消失。我听见身后有脚步声追来，却不敢回头……',
      mood: '悬疑'
    },
    {
      title: '童年的教室',
      excerpt: '阳光透过绿色窗帘洒进来，黑板上写满了看不懂的符号。窗外是无尽的麦田，风吹过，金色的波浪此起彼伏……',
      mood: '治愈'
    },
    {
      title: '最后的告别',
      excerpt: '火车站台挤满了人，蒸汽机车轰鸣着。我拼命挤向即将关闭的车门，手里攥着一封永远没能寄出的信……',
      mood: '温情'
    }
  ]

  return (
    <div className={styles.page}>
      {/* Header Actions */}
      <div className={styles.headerActions}>
        {user ? (
          <Link to="/profile" className={styles.headerProfile}>
            <span className={styles.headerAvatar}>
              {user.nickname?.charAt(0) || '我'}
            </span>
            <span className={styles.headerNickname}>{user.nickname || '我的'}</span>
          </Link>
        ) : (
          <>
            <Link to="/login" className={styles.headerLogin}>登录</Link>
            <Link to="/register" className={styles.headerRegister}>注册</Link>
          </>
        )}
      </div>

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
          ) : isReturningUser && leftOffMessage ? (
            <>
              <span className={styles.heroTitleLine}>欢迎回来</span>
              <span className={styles.heroTitleAccent}>继续你的旅程</span>
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
            : isReturningUser && leftOffMessage
              ? leftOffMessage
              : lastDreamDate
                ? `上次记录：${lastDreamDate}`
                : '继续记录你的梦境'}
        </p>

        <div className={styles.heroCta}>
          <Link to="/dream">
            <Button size="lg">
              {isNewUser ? '开始记录' : '继续记录'}
            </Button>
          </Link>
        </div>

        {/* Achievement progress hint - only for returning users */}
        {!isNewUser && (
          <AchievementHint history={history} />
        )}
      </section>

      {/* Sample Stories - only for new users */}
      {isNewUser && (
        <section className={styles.sampleSection}>
          <h2 className={styles.sampleTitle}>别人的梦境</h2>
          <p className={styles.sampleSubtitle}>每一次记录，都是一场独特的冒险</p>
          <div className={styles.sampleBadge}>以下为示例</div>
          <div className={styles.sampleGrid}>
            {sampleStories.map((story, index) => (
              <div key={index} className={styles.sampleCard}>
                <div className={styles.sampleMood}>{story.mood}</div>
                <h3 className={styles.sampleCardTitle}>{story.title}</h3>
                <p className={styles.sampleCardExcerpt}>{story.excerpt}</p>
              </div>
            ))}
          </div>
        </section>
      )}

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

// Achievement progress hint component
interface AchievementHintProps {
  history: DreamSession[]
}

function AchievementHint({ history }: AchievementHintProps) {
  const { achievements } = useDreamStore()

  // Find the closest locked achievement to unlock
  const getProgress = () => {
    for (const achievement of ACHIEVEMENTS) {
      if (achievements.includes(achievement.id)) continue

      switch (achievement.id) {
        case 'week_streak': {
          // Check consecutive days from history dates
          if (history.length === 0) return null
          const dates = history.map(h => h.date).slice(0, 7)
          if (dates.length < 2) {
            return {
              icon: achievement.icon,
              text: `已连续记录 ${dates.length} 天，再坚持 ${7 - dates.length} 天解锁`,
              progress: dates.length / 7
            }
          }
          return null // Already unlocked or not in consecutive streak
        }
        case 'story_collector': {
          const count = history.length
          if (count < 10) {
            return {
              icon: achievement.icon,
              text: `再保存 ${10 - count} 个故事解锁「${achievement.title}」`,
              progress: count / 10
            }
          }
          return null
        }
        case 'first_dream': {
          return null // Already handled by new user flow
        }
        default:
          return null
      }
    }
    return null
  }

  const progress = getProgress()
  if (!progress) return null

  return (
    <div className={styles.achievementHint}>
      <div className={styles.achievementHintIcon}>{progress.icon}</div>
      <div className={styles.achievementHintText}>{progress.text}</div>
      <div className={styles.achievementHintBar}>
        <div
          className={styles.achievementHintFill}
          style={{ width: `${progress.progress * 100}%` }}
        />
      </div>
    </div>
  )
}
