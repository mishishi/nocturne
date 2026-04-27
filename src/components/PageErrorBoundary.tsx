import React from 'react'
import styles from './ErrorFallback.module.css'

interface PageErrorBoundaryState {
  hasError: boolean
}

interface PageErrorBoundaryProps {
  children?: React.ReactNode
}

export class PageErrorBoundary extends React.Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('PageErrorBoundary caught an error:', error, errorInfo)
  }

  handleGoBack = (): void => {
    window.history.back()
  }

  handleRetry = (): void => {
    this.setState({ hasError: false })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.page}>
          {/* Animated star field background */}
          <div className={styles.starfield}>
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={styles.star}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 4}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                  width: `${1 + Math.random() * 2}px`,
                  height: `${1 + Math.random() * 2}px`
                }}
              />
            ))}
          </div>

          <h1 className={styles.title}>该页面暂时无法加载</h1>
          <p className={styles.message}>抱歉，内容加载时遇到问题</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.textBtn}
              onClick={this.handleGoBack}
            >
              返回上一页
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={this.handleRetry}
            >
              重新加载
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
