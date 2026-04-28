import styles from './ChatBubble.module.css'

interface ChatBubbleProps {
  message: string
  isMine: boolean
  timestamp: string
}

export function ChatBubble({ message, isMine, timestamp }: ChatBubbleProps) {
  return (
    <div className={`${styles.bubble} ${isMine ? styles.mine : styles.theirs}`}>
      <div className={styles.content}>
        <p className={styles.text}>{message}</p>
        <span className={styles.timestamp}>{timestamp}</span>
      </div>
    </div>
  )
}
