import styles from './SkipLink.module.css'

export function SkipLink() {
  return (
    <a href="#main-content" className={styles.skipLink}>
      跳转到主要内容
    </a>
  )
}
