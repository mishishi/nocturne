import { useEffect } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $crisp: any[]
    CRISP_WEBSITE_ID: string
    CRISP_RUNTIME_CONFIG: Record<string, unknown>
  }
}

interface SupportChatProps {
  websiteId: string
}

/**
 * Crisp Chat Widget Component
 * 嵌入式客服聊天组件
 */
export function SupportChat({ websiteId }: SupportChatProps) {
  useEffect(() => {
    // Prevent multiple initializations
    if (window.$crisp) return

    // Set website ID
    window.CRISP_WEBSITE_ID = websiteId

    // Initialize Crisp queue
    window.$crisp = []

    // Add Crisp loader script
    const script = document.createElement('script')
    script.src = 'https://client.crisp.chat/l.js'
    script.async = true

    script.onerror = () => {
      console.error('[SupportChat] Failed to load Crisp chat script')
    }

    document.head.appendChild(script)

    // Configure Crisp runtime
    window.CRISP_RUNTIME_CONFIG = {
      session_lifetime: 3600 // 1 hour session
    }
  }, [websiteId])

  return null // This component doesn't render anything visible
}

/**
 * Check if Crisp is loaded and ready
 */
export function isCrispReady(): boolean {
  return !!(window.$crisp && window.$crisp.push)
}

/**
 * Configure Crisp chat settings
 */
export function configureCrisp(config: {
  nickname?: string
  email?: string
  avatar?: string
  data?: Record<string, string>
}) {
  if (!isCrispReady()) return

  if (config.nickname) {
    window.$crisp.push(['set', 'user:nickname', [config.nickname]])
  }
  if (config.email) {
    window.$crisp.push(['set', 'user:email', [config.email]])
  }
  if (config.avatar) {
    window.$crisp.push(['set', 'user:avatar', [config.avatar]])
  }
  if (config.data) {
    Object.entries(config.data).forEach(([key, value]) => {
      window.$crisp.push(['set', 'session:data', [[key, value]]])
    })
  }
}

/**
 * Open Crisp chat
 */
export function openCrispChat() {
  if (!isCrispReady()) return
  window.$crisp.push(['do', 'Chat:open'])
}

/**
 * Close Crisp chat
 */
export function closeCrispChat() {
  if (!isCrispReady()) return
  window.$crisp.push(['do', 'Chat:close'])
}

/**
 * Hide Crisp chat
 */
export function hideCrispChat() {
  if (!isCrispReady()) return
  window.$crisp.push(['do', 'Chat:hide'])
}

/**
 * Show Crisp chat
 */
export function showCrispChat() {
  if (!isCrispReady()) return
  window.$crisp.push(['do', 'Chat:show'])
}
