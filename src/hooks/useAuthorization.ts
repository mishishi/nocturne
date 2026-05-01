import { useMemo } from 'react'
import { useDreamStore } from './useDreamStore'

interface AuthorableResource {
  session?: { userId?: string }
  author?: { id?: string; openid?: string }
  authorOpenid?: string | null
}

export function useIsAuthor(resource: AuthorableResource | null): boolean {
  const { user } = useDreamStore()

  return useMemo(() => {
    if (!user) return false
    if (user.isAdmin) return true

    const authorId = resource?.session?.userId || resource?.author?.id
    const authorOpenid = resource?.author?.openid ?? resource?.authorOpenid ?? undefined

    return authorId === user.id || authorOpenid === user.openid
  }, [user, resource])
}
