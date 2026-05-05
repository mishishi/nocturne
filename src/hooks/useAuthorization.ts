import { useMemo } from 'react'
import { useDreamStore } from './useDreamStore'

interface AuthorableResource {
  session?: { userId?: string }
  author?: { id?: string; openid?: string }
  authorOpenid?: string | null
}

export function useIsAuthor(resource: AuthorableResource | null): boolean {
  const { user } = useDreamStore()

  const result = useMemo(() => {
    if (!user) return false
    if (user.isAdmin) return true

    const authorId = resource?.session?.userId || resource?.author?.id
    const authorOpenid = resource?.author?.openid ?? resource?.authorOpenid ?? undefined
    const isAuthor = authorId === user.id || authorOpenid === user.openid

    console.log('[useIsAuthor] debug:', {
      'resource?.authorOpenid': resource?.authorOpenid,
      'resource?.author?.openid': resource?.author?.openid,
      'user.openid': user.openid,
      'user.id': user.id,
      authorId,
      authorOpenid,
      isAuthor
    })

    return isAuthor
  }, [user, resource])

  return result
}
