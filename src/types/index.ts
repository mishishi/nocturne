// Shared User type used across the application
export interface User {
  id: string
  openid: string
  nickname?: string
  avatar?: string
  phone?: string
  isMember: boolean
  isAdmin?: boolean
  memberSince?: string
  points: number
  medals: string[]
  consecutiveShares: number
  lastShareDate?: string
}

// Friend type
export interface Friend {
  id: string
  friendId: string
  nickname?: string
  avatar?: string
  isMember: boolean
  memberSince?: string
  friendsSince: string
}
