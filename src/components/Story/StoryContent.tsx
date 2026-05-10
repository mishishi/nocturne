import styles from '../../pages/Story.module.css'

interface StoryContentProps {
  story: string
  showContent: boolean
  fromHistory?: boolean
  fromDreamWall?: boolean
  onReplay: () => void
}

export function StoryContent({
  story,
  showContent,
  fromHistory,
  fromDreamWall,
  onReplay
}: StoryContentProps) {
  return (
    <>
      {/* Story Content */}
      <article className={`${styles.story} ${showContent ? styles.storyVisible : ''}`}>
        {story.split('\n').map((paragraph: string, index: number) => (
          paragraph.trim() && (
            <p key={index} className={styles.paragraph} style={{ animationDelay: `${0.6 + index * 0.1}s` }}>
              {paragraph}
            </p>
          )
        ))}
      </article>

      {/* Replay Button for Typewriter Animation */}
      {!fromHistory && !fromDreamWall && (
        <button
          className={styles.replayBtn}
          onClick={onReplay}
          title="重新播放动画"
          aria-label="重新播放动画"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      )}
    </>
  )
}
