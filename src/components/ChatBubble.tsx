import styles from './ChatBubble.module.css'

interface ChatBubbleProps {
  message: string
  isMine: boolean
  timestamp: string
  sending?: boolean
}

export function ChatBubble({ message, isMine, timestamp, sending }: ChatBubbleProps) {
  return (
    <div className={`${styles.bubble} ${isMine ? styles.mine : styles.theirs}`}>
      <div className={styles.content}>
        <p className={styles.text}>{message}</p>
        <span className={styles.timestamp}>
          {timestamp}
          {sending && <span className={styles.sendingIndicator}>发送中...</span>}
        </span>
      </div>
    </div>
  )
}
