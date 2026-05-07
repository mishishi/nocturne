import styles from './ChatBubble.module.css'

interface ChatBubbleProps {
  message: string
  isMine: boolean
  timestamp: string
  sending?: boolean
  onDelete?: () => void
}

export function ChatBubble({ message, isMine, timestamp, sending, onDelete }: ChatBubbleProps) {
  return (
    <div className={`${styles.bubble} ${isMine ? styles.mine : styles.theirs}`}>
      <div className={styles.content}>
        <p className={styles.text}>{message}</p>
        <span className={styles.timestamp}>
          {timestamp}
          {sending && <span className={styles.sendingIndicator}>发送中...</span>}
        </span>
        {isMine && onDelete && (
          <button
            className={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            aria-label="删除消息"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
