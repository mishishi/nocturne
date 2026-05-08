import { useCallback } from 'react'
import {
  openCrispChat,
  closeCrispChat,
  configureCrisp,
  isCrispReady
} from '../components/SupportChat'

interface UseSupportChatOptions {
  websiteId: string
}

interface UseSupportChatReturn {
  isReady: boolean
  open: () => void
  close: () => void
  configure: (config: {
    nickname?: string
    email?: string
    avatar?: string
    data?: Record<string, string>
  }) => void
}

/**
 * 客服聊天 Hook
 */
export function useSupportChat(_options: UseSupportChatOptions): UseSupportChatReturn {

  const open = useCallback(() => {
    if (isCrispReady()) {
      openCrispChat()
    } else {
      console.warn('[SupportChat] Crisp is not ready yet')
    }
  }, [])

  const close = useCallback(() => {
    if (isCrispReady()) {
      closeCrispChat()
    }
  }, [])

  const configure = useCallback((config: {
    nickname?: string
    email?: string
    avatar?: string
    data?: Record<string, string>
  }) => {
    if (isCrispReady()) {
      configureCrisp(config)
    }
  }, [])

  return {
    isReady: isCrispReady(),
    open,
    close,
    configure
  }
}
