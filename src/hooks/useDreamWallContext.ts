import { useLocation } from 'react-router-dom'
import { useState } from 'react'

export interface DreamWallContext {
  fromDreamWall: boolean
  sessionId: string | null
  storyTitle: string | null
  storyFull: string | null
  authorOpenid: string | null
  postId: string | null
}

const CONTEXT_KEY = 'dreamwall_context'

export function useDreamWallContext(): DreamWallContext {
  const location = useLocation()
  const [context] = useState<DreamWallContext>(() => {
    const locState = location.state as any

    // 优先用 location.state（页面刷新后丢失）
    if (locState?.fromDreamWall && locState?.sessionId) {
      return {
        fromDreamWall: true,
        sessionId: locState.sessionId,
        storyTitle: locState.storyTitle || null,
        storyFull: locState.storyFull || null,
        authorOpenid: locState.authorOpenid || null,
        postId: locState.postId || null,
      }
    }

    // 页面刷新：用 sessionStorage 恢复
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(CONTEXT_KEY)
        if (raw) return JSON.parse(raw)
      } catch { /* ignore */ }
    }

    return {
      fromDreamWall: false,
      sessionId: null,
      storyTitle: null,
      storyFull: null,
      authorOpenid: null,
      postId: null,
    }
  })

  return context
}

// 存储上下文（DreamWall.tsx 调用）
export function storeDreamWallContext(ctx: DreamWallContext): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx))
}

// 清除上下文（Story.tsx 离开时调用）
export function clearDreamWallContext(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(CONTEXT_KEY)
}
