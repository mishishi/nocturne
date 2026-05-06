import { useRef, useEffect } from 'react'
import { User } from '../hooks/useDreamStore'
import styles from './AiAssistantMenu.module.css'

interface AiAssistantMenuProps {
  isSpeaking: boolean
  voices: SpeechSynthesisVoice[]
  selectedVoice: SpeechSynthesisVoice | null
  user: User | null
  isInterpreting: boolean
  onSpeak: () => void
  onVoiceSelect: (voice: SpeechSynthesisVoice) => void
  onInterpret: () => void
  onClose: () => void
}

export function AiAssistantMenu({
  isSpeaking,
  voices,
  selectedVoice,
  user,
  isInterpreting,
  onSpeak,
  onVoiceSelect,
  onInterpret,
  onClose
}: AiAssistantMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Focus trap and Escape
  useEffect(() => {
    if (!menuRef.current) return
    const menuItems = menuRef.current.querySelectorAll('button')
    const firstItem = menuItems[0]
    const lastItem = menuItems[menuItems.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault()
          lastItem.focus()
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault()
          firstItem.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    firstItem?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const googleVoices = voices.slice(0, 3)

  return (
    <div className={styles.aiMenu} role="menu" aria-label="AI 助手选项" ref={menuRef}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>🌙</div>
          <div className={styles.headerText}>
            <p className={styles.headerTitle}>AI 梦境助手</p>
            <p className={styles.headerSubtitle}>探索梦境的奥秘</p>
          </div>
        </div>

        {/* Speak Button */}
        <button
          className={styles.menuItem}
          onClick={() => {
            onSpeak()
            onClose()
          }}
          role="menuitem"
          tabIndex={0}
        >
          <div className={styles.menuIcon}>
            {isSpeaking ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </div>
          <div className={styles.menuLabel}>
            <span className={styles.menuPrimary}>{isSpeaking ? '停止朗读' : '听故事朗读'}</span>
            {isSpeaking && <span className={styles.menuSecondary}>正在播放中...</span>}
          </div>
          {isSpeaking && <div className={styles.speakingIndicator} />}
        </button>

        {/* Voice Selection */}
        {googleVoices.length >= 1 && !isSpeaking && (
          <div className={styles.voiceSection}>
            <div className={styles.voiceSectionInner}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionDot} />
                <span className={styles.sectionTitle}>选择声音</span>
              </div>
              <div className={styles.voiceList}>
                {googleVoices.map((voice) => (
                  <button
                    key={voice.name}
                    className={`${styles.voiceButton} ${selectedVoice?.name === voice.name ? styles.selectedVoice : ''}`}
                    onClick={() => onVoiceSelect(voice)}
                    role="menuitem"
                    tabIndex={0}
                  >
                    <div className={styles.voiceIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      </svg>
                    </div>
                    <span className={styles.voiceName}>
                      {voice.name.length > 20 ? voice.name.substring(0, 20) + '…' : voice.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Points Hint */}
        {user && (
          <div className={styles.pointsHint}>
            <span>剩余积分</span>
            <strong>{user.points ?? 0}</strong>
            <span className={styles.divider} />
            <span>解读消耗</span>
            <strong>10</strong>
          </div>
        )}

        {/* Interpret Button */}
        <button
          className={`${styles.menuItem} ${!user || user.points < 10 ? styles.menuItemDisabled : ''}`}
          onClick={() => {
            if (!user || user.points < 10) return
            onInterpret()
            onClose()
          }}
          role="menuitem"
          tabIndex={0}
          title={!user ? '请先登录' : user.points < 10 ? '积分不足' : ''}
        >
          <div className={styles.menuIcon}>
            {!user ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                <path d="M9 21h6" />
              </svg>
            )}
          </div>
          <div className={styles.menuLabel}>
            <span className={styles.menuPrimary}>
              {isInterpreting ? '解读生成中…' : user ? 'AI 梦境解读' : '登录后使用'}
            </span>
            {user && user.points < 10 && (
              <span className={styles.menuSecondary}>积分不足</span>
            )}
          </div>
        </button>
      </div>
    </div>
  )
}
