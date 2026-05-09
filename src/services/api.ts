// Real API service - connects to Express backend
// In development, use mock API for UI testing

import { getAuthToken } from '../utils/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

// ============ 统一响应类型 ============
export interface ApiSuccessResponse<T> {
  success: true
  data: T
  message?: string
  timestamp: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  timestamp: string
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// 通用分页类型
export interface Pagination {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

// 分页信息类型别名
export type PaginationInfo = Pagination

// 验证响应是否成功
export function isApiSuccess<T>(res: ApiResponse<T>): res is ApiSuccessResponse<T> {
  return res.success === true
}
const FETCH_TIMEOUT = 15000
const LONG_FETCH_TIMEOUT = 60000 // For AI generation endpoints (questions, story, interpretation)

// Re-export getAuthToken for backwards compatibility
export { getAuthToken } from '../utils/auth'

// Fetch with timeout using AbortSignal
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, { ...options, credentials: 'include', signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

// Fetch with longer timeout for AI endpoints
async function fetchWithLongTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), LONG_FETCH_TIMEOUT)
  try {
    const res = await fetch(url, { ...options, credentials: 'include', signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

// ============ API 调用包装器 ============

/**
 * 带指数退避的重试包装器
 * @param fn 要重试的异步函数
 * @param maxRetries 最大重试次数（默认3次）
 * @param baseDelay 基础延迟毫秒数（默认1000ms）
 * @param operationName 操作名称（用于错误信息）
 */
export async function retryWrapper<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = 'API call'
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries) {
        // 指数退避：1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`[API Retry] ${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, lastError.message)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // 所有重试都失败后，抛出包含详细信息的错误
  const finalError = new Error(
    `${operationName} failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
  )
  finalError.cause = lastError
  console.error(`[API Retry] ${finalError.message}`)
  throw finalError
}

// 带重试的关键 API 封装
export const apiWithRetry = {
  // 发布故事到梦墙（带重试）
  async publishStory(openid: string, sessionId: string, isAnonymous?: boolean): Promise<ApiResponse<{ post: { id: string } }>> {
    return retryWrapper(
      () => wallApi.publish({ openid, sessionId, isAnonymous }),
      3,
      1000,
      '发布故事'
    )
  },

  // 切换故事收藏状态（带重试）
  async toggleStoryFavorite(sessionId: string): Promise<ApiResponse<{ favorited: boolean }>> {
    return retryWrapper(
      () => wallApi.toggleStoryFavorite(sessionId),
      3,
      1000,
      '切换收藏'
    )
  },

  // 同步成就到服务器（带重试）
  async syncAchievements(medals: string[]): Promise<ApiResponse<{ medals: string[] }>> {
    return retryWrapper(
      () => achievementApi.syncAchievements(medals),
      3,
      1000,
      '同步成就'
    )
  }
}

// Common headers - auth now handled via httpOnly cookies (auto-sent by browser)
// Kept for backward compatibility - returns empty object
function authHeaders(): HeadersInit {
  return {}
}

// Types - import from shared types and re-export for backwards compatibility
export type { User } from '../types'
import type { User } from '../types'

// Friend system API response types (per spec)
export interface FriendListItem {
  id: string
  openid: string
  nickname: string
  avatar: string
  friendSince: string
}

export interface FriendRequestItem {
  id: string
  openid: string
  nickname: string
  avatar: string
  createdAt: string
}

// Dream Interpretation structured data
export interface DreamInterpretationData {
  dreamerPersonality: string
  dreamerPersonalityDesc: string
  emotionalTrend: {
    current: string
    insight: string
  }
  recurringSymbols: Array<{
    symbol: string
    meaning: string
    frequency: number
  }>
  sleepQualityScore: number
  dreamActivityLevel: string
  tips: string[]
}

// Session API
export interface Session {
  id: string
  sessionId: string  // Same as id, returned for clarity
  openid: string
  date: string
  dreamFragment: string
  storyTitle: string
  story: string
}

export const api = {
  // Create session
  async createSession(openid: string): Promise<ApiResponse<{ sessionId: string; status: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openid })
    })
    if (!res.ok) throw new Error(`创建会话失败: ${res.status}`)
    return res.json()
  },

  // Submit dream and get all questions
  async submitDream(sessionId: string, content: string, styleTag: string): Promise<ApiResponse<{ questions: string[]; questionIndex: number }>> {
    const res = await fetchWithLongTimeout(`${API_BASE}/sessions/${sessionId}/dream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, styleTag })
    })
    if (!res.ok) throw new Error(`提交梦境失败: ${res.status}`)
    return res.json()
  },

  // Submit answer and get next question or story
  async submitAnswer(sessionId: string, answer: string): Promise<ApiResponse<{
    nextQuestion?: string
    nextIndex?: number
    isLastQuestion?: boolean
  }>> {
    const res = await fetchWithLongTimeout(`${API_BASE}/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer })
    })
    if (!res.ok) throw new Error(`提交回答失败: ${res.status}`)
    return res.json()
  },

  // Get story
  async getStory(sessionId: string): Promise<ApiResponse<{ story: { title: string; content: string } }>> {
    const res = await fetchWithTimeout(`${API_BASE}/sessions/${sessionId}/story`)
    if (!res.ok) throw new Error(`获取故事失败: ${res.status}`)
    return res.json()
  },

  // Get user history
  async getHistory(openid: string, page = 1, limit = 20): Promise<ApiResponse<{
    sessions: Session[]
    pagination: Pagination
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/sessions/users/${openid}/history?page=${page}&limit=${limit}`)
    if (!res.ok) throw new Error(`获取历史失败: ${res.status}`)
    return res.json()
  },

  // Request dream interpretation
  async interpret(sessionId: string): Promise<ApiResponse<{
    interpretation?: string
    pointsUsed?: number
    remainingPoints?: number
    alreadyExists?: boolean
    shouldShowModal?: boolean
    reason?: string
  }>> {
    const res = await fetchWithLongTimeout(`${API_BASE}/sessions/${sessionId}/interpret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({})
    })
    if (!res.ok) throw new Error(`请求解读失败: ${res.status}`)
    return res.json()
  },

  // Get existing interpretation
  async getInterpretation(sessionId: string): Promise<ApiResponse<{
    interpretation: string | null
    interpretationVisibility?: string
    interpretationData?: DreamInterpretationData
    personalityTag?: { name: string; description: string }
    historyComparison?: string
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/sessions/${sessionId}/interpretation`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取解读失败: ${res.status}`)
    return res.json()
  },

  // Submit interpretation feedback
  async submitInterpretationFeedback(
    sessionId: string,
    isAccurate: boolean,
    comment?: string
  ): Promise<ApiResponse<{ feedback: { id: string; isAccurate: boolean; comment?: string } }>> {
    const res = await fetchWithTimeout(`${API_BASE}/sessions/${sessionId}/interpretation-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ isAccurate, comment })
    })
    if (!res.ok) throw new Error(`提交反馈失败: ${res.status}`)
    return res.json()
  },

  // Get interpretation feedback status
  async getInterpretationFeedback(
    sessionId: string
  ): Promise<ApiResponse<{ feedback: { id: string; isAccurate: boolean; comment?: string } | null }>> {
    const res = await fetchWithTimeout(`${API_BASE}/sessions/${sessionId}/interpretation-feedback`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取反馈状态失败: ${res.status}`)
    return res.json()
  },

  // Migrate guest sessions to logged-in user
  async migrateSession(guestOpenid: string): Promise<ApiResponse<{
    migrated: number
    sessionIds?: string[]
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/sessions/migrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ guestOpenid })
    })
    if (!res.ok) throw new Error(`迁移会话失败: ${res.status}`)
    return res.json()
  },

  // Export user data
  async exportData(): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/export-data`, {
      method: 'POST'
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '导出失败')
    }

    const contentDisposition = res.headers.get('Content-Disposition') || ''
    const filenameMatch = contentDisposition.match(/filename="(.+)"/)
    const filename = filenameMatch ? filenameMatch[1] : `yeelin_data_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.json`

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Share API
export type ShareType = 'poster' | 'moment' | 'link' | 'friend'

export interface ShareResult {
  pointsEarned?: number
  totalPoints?: number
  consecutiveDays?: number
  medalsUnlocked?: string[]
  shareId?: string
  reason?: string
}

export interface UserStats {
  points: number
  medals: string[]
  consecutiveShares: number
  lastShareDate: string | null
  todayShareCount: { poster: number; moment: number; link: number; friend: number }
  dailyLimit: { poster: number; moment: number; link: number; friend: number }
  inviteCode: string
}

export const shareApi = {
  // Log a share action and get rewards
  async logShare(openid: string, type: ShareType): Promise<ApiResponse<ShareResult>> {
    const res = await fetchWithTimeout(`${API_BASE}/share/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ openid, type })
    })
    if (!res.ok) throw new Error(`记录分享失败: ${res.status}`)
    return res.json()
  },

  // Get user sharing stats
  async getStats(openid: string): Promise<ApiResponse<UserStats>> {
    const res = await fetchWithTimeout(`${API_BASE}/share/stats/${openid}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取分享统计失败: ${res.status}`)
    return res.json()
  },

  // Create an invite code
  async createInvite(openid: string): Promise<ApiResponse<{ inviteCode: string; inviteUrl: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/share/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ openid })
    })
    if (!res.ok) throw new Error(`创建邀请码失败: ${res.status}`)
    return res.json()
  },

  // Use an invite code (friend accepts invite)
  async useInvite(inviteCode: string, openid: string): Promise<ApiResponse<{ inviterOpenid?: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/share/use-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ inviteCode, openid })
    })
    if (!res.ok) throw new Error(`使用邀请码失败: ${res.status}`)
    return res.json()
  }
}

// Auth API
export const authApi = {
  // WeChat login
  async wechatLogin(openid: string): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/wechat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openid })
    })
    if (!res.ok) throw new Error(`微信登录失败: ${res.status}`)
    return res.json()
  },

  // Phone + password login
  async phoneLogin(phone: string, password: string): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/phone-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    })
    if (!res.ok) throw new Error(`手机登录失败: ${res.status}`)
    return res.json()
  },

  // Register with phone + password
  async register(phone: string, password: string, nickname?: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, nickname })
    })
    if (!res.ok) throw new Error(`注册失败: ${res.status}`)
    return res.json()
  },

  // Update user profile
  async updateProfile(openid: string, data: { nickname?: string; avatar?: string }): Promise<ApiResponse<{ user: User }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ openid, ...data })
    })
    if (!res.ok) throw new Error(`更新资料失败: ${res.status}`)
    return res.json()
  },

  // Get user by openid
  async getUser(openid: string): Promise<ApiResponse<{ user: User }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/user/${openid}`)
    if (!res.ok) throw new Error(`获取用户失败: ${res.status}`)
    return res.json()
  },

  // Verify token
  async verifyToken(token: string): Promise<ApiResponse<{ user: User }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    if (!res.ok) throw new Error(`验证Token失败: ${res.status}`)
    return res.json()
  },

  // Send password reset code
  async sendResetCode(phone: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/send-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    })
    if (!res.ok) throw new Error(`发送验证码失败: ${res.status}`)
    return res.json()
  },

  // Reset password with verification code
  async resetPassword(phone: string, code: string, password: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, password })
    })
    if (!res.ok) throw new Error(`重置密码失败: ${res.status}`)
    return res.json()
  },

  // Delete user account
  async deleteAccount(): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/account`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error(`删除账号失败: ${res.status}`)
    return res.json()
  },

  // Email + password login
  async emailLogin(email: string, password: string): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/email-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (!res.ok) throw new Error(`邮箱登录失败: ${res.status}`)
    return res.json()
  },

  // Email + password registration
  async emailRegister(email: string, password: string, nickname?: string): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/email-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nickname })
    })
    if (!res.ok) throw new Error(`邮箱注册失败: ${res.status}`)
    return res.json()
  },

  // Send email verification code
  async sendEmailCode(email: string, purpose: 'login' | 'bind' | 'reset'): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/send-email-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose })
    })
    if (!res.ok) throw new Error(`发送验证码失败: ${res.status}`)
    return res.json()
  },

  // Verify email code
  async verifyEmailCode(email: string, code: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/verify-email-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    })
    if (!res.ok) throw new Error(`验证失败: ${res.status}`)
    return res.json()
  },

  // Bind email to existing account
  async bindEmail(email: string, code: string): Promise<ApiResponse<{ user: User }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/bind-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ email, code })
    })
    if (!res.ok) throw new Error(`绑定邮箱失败: ${res.status}`)
    return res.json()
  },

  // Change password
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ oldPassword, newPassword })
    })
    if (!res.ok) throw new Error(`修改密码失败: ${res.status}`)
    return res.json()
  },

  // Refresh access token using refresh token
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
    if (!res.ok) throw new Error(`刷新Token失败: ${res.status}`)
    return res.json()
  },

  // Logout (revoke refresh token) - server reads from httpOnly cookie
  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/refresh-token`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error(`登出失败: ${res.status}`)
    return res.json()
  },

  // Get current logged-in user (uses httpOnly cookie for auth)
  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/me`)
    if (!res.ok) throw new Error(`获取当前用户失败: ${res.status}`)
    return res.json()
  }
}

// Friend API
export const friendApi = {
  // Send friend request
  async sendFriendRequest(friendOpenid: string): Promise<ApiResponse<{ success: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ friendOpenid })
    })
    if (!res.ok) throw new Error(`发送好友请求失败: ${res.status}`)
    return res.json()
  },

  // Accept friend request
  async acceptFriendRequest(requestId: string): Promise<ApiResponse<{ success: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ requestId })
    })
    if (!res.ok) throw new Error(`接受好友请求失败: ${res.status}`)
    return res.json()
  },

  // Reject friend request
  async rejectFriendRequest(requestId: string): Promise<ApiResponse<{ success: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ requestId })
    })
    if (!res.ok) throw new Error(`拒绝好友请求失败: ${res.status}`)
    return res.json()
  },

  // Remove friend
  async removeFriend(friendOpenid: string): Promise<ApiResponse<{ success: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/${friendOpenid}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`删除好友失败: ${res.status}`)
    return res.json()
  },

  // Get friend list
  async getFriends(): Promise<ApiResponse<{ friends: FriendListItem[] }>> {
    const res = await fetchWithTimeout(`${API_BASE}/friends`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取好友列表失败: ${res.status}`)
    return res.json()
  },

  // Get pending friend requests
  async getFriendRequests(): Promise<ApiResponse<{ requests: FriendRequestItem[] }>> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/requests`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取好友请求失败: ${res.status}`)
    return res.json()
  },

  // Get sent friend requests
  async getSentRequests(): Promise<ApiResponse<{ sentRequests: FriendRequestItem[] }>> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/sent`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取发出的好友请求失败: ${res.status}`)
    return res.json()
  },

  // Get friend's public posts
  async getFriendPosts(openid: string, page = 1, limit = 20): Promise<ApiResponse<{
    posts: DreamWallPost[]
    pagination: Pagination
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/${openid}/posts?page=${page}&limit=${limit}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取好友发布失败: ${res.status}`)
    return res.json()
  },

  // Block user
  async blockUser(userId: string, blockedId: string): Promise<ApiResponse<{ blocked: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ userId, blockedId })
    })
    if (!res.ok) throw new Error(`拉黑用户失败: ${res.status}`)
    return res.json()
  },

  // Search users
  async searchUsers(query: string, excludeId?: string): Promise<ApiResponse<{ users: Array<{ id: string; openid: string; nickname?: string; avatar?: string; isMember: boolean }> }>> {
    const params = new URLSearchParams({ query })
    if (excludeId) params.append('excludeId', excludeId)
    const res = await fetchWithTimeout(`${API_BASE}/friends/search?${params}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`搜索用户失败: ${res.status}`)
    return res.json()
  },

  // Get friend count
  async getFriendCount(userId: string): Promise<ApiResponse<{ count: number }>> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/count/${userId}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取好友数量失败: ${res.status}`)
    return res.json()
  }
}

// Dream Wall API
export interface DreamWallPost {
  id: string
  sessionId: string
  openid: string // 作者 openid，用于权限判断
  storyTitle: string
  storySnippet: string
  storyFull?: string // Full story content for direct navigation
  dreamFragment?: string // 原始梦境碎片
  isAnonymous: boolean
  isOwnStory?: boolean
  nickname?: string
  avatar?: string
  likeCount: number
  commentCount: number
  isFeatured: boolean
  hasLiked?: boolean
  isFavorite?: boolean
  isFriend?: boolean
  createdAt: string
  // Featured algorithm fields (only populated when tab=featured)
  engagementScore?: number
}

export interface DreamWallComment {
  id: string
  content: string
  isAnonymous: boolean
  nickname?: string
  avatar?: string
  createdAt: string
}

export const wallApi = {
  // Get wall posts (public, no auth needed)
  async getPosts(params: {
    tab?: 'all' | 'featured'
    page?: number
    limit?: number
    keyword?: string
    openid?: string
  }): Promise<ApiResponse<{
    posts: DreamWallPost[]
    pagination: Pagination
  }>> {
    const { tab = 'all', page = 1, limit = 20, keyword, openid } = params
    const queryParams = new URLSearchParams({ tab, page: String(page), limit: String(limit) })
    if (keyword) queryParams.set('keyword', keyword)
    if (openid) queryParams.set('openid', openid)
    const res = await fetchWithTimeout(`${API_BASE}/wall?${queryParams}`)
    if (!res.ok) throw new Error(`获取梦墙失败: ${res.status}`)
    return res.json()
  },

  // Get friends feed (需登录)
  async getFriendFeed(params: {
    page?: number
    limit?: number
  }): Promise<ApiResponse<{
    posts: DreamWallPost[]
    pagination: Pagination
  }>> {
    const { page = 1, limit = 20 } = params
    const res = await fetchWithTimeout(`${API_BASE}/wall/friends?page=${page}&limit=${limit}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取关注的人动态失败: ${res.status}`)
    return res.json()
  },

  // Publish to wall (需登录)
  async publish(params: {
    openid: string
    sessionId: string
    isAnonymous?: boolean
    visibility?: 'public' | 'private'
  }): Promise<ApiResponse<{ post: { id: string } }>> {
    const res = await fetchWithTimeout(`${API_BASE}/wall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(params)
    })
    if (!res.ok) throw new Error(`发布到梦墙失败: ${res.status}`)
    return res.json()
  },

  // Get my posts (需登录)
  async getMyPosts(openid: string): Promise<ApiResponse<{
    posts: Array<{
      id: string
      sessionId: string
      storyTitle: string
      storySnippet: string
      storyFull?: string
      isAnonymous: boolean
      isOwnStory: boolean
      nickname?: string
      likeCount: number
      commentCount: number
      status: string
      isFeatured: boolean
      createdAt: string
    }>
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/my?openid=${openid}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取我的发布失败: ${res.status}`)
    return res.json()
  },

  // Toggle like (需登录)
  async toggleLike(postId: string, openid: string): Promise<ApiResponse<{ liked: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ openid })
    })
    if (!res.ok) throw new Error(`点赞失败: ${res.status}`)
    return res.json()
  },

  // Toggle favorite (需登录)
  async toggleFavorite(postId: string, openid: string): Promise<ApiResponse<{ favorited: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/${postId}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ openid })
    })
    if (!res.ok) throw new Error(`收藏失败: ${res.status}`)
    return res.json()
  },

  // Toggle story favorite (需登录)
  async toggleStoryFavorite(sessionId: string): Promise<ApiResponse<{ favorited: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/favorites/story/${sessionId}`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`收藏故事失败: ${res.status}`)
    return res.json()
  },

  // Get story favorites (需登录)
  async getStoryFavorites(): Promise<ApiResponse<{
    stories: Array<{
      sessionId: string
      storyTitle: string
      story: string
      createdAt: string
      date: string
    }>
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/favorites/story`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取收藏故事失败: ${res.status}`)
    return res.json()
  },

  // Get favorites (需登录)
  async getFavorites(params: {
    page?: number
    limit?: number
  }): Promise<ApiResponse<{
    posts: DreamWallPost[]
    pagination: Pagination
  }>> {
    const { page = 1, limit = 20 } = params
    const res = await fetchWithTimeout(`${API_BASE}/wall/favorites?page=${page}&limit=${limit}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取收藏列表失败: ${res.status}`)
    return res.json()
  },

  // Get comments (public, no auth needed)
  async getComments(postId: string, page = 1, limit = 20): Promise<ApiResponse<{
    comments: Array<{
      id: string
      content: string
      isAnonymous: boolean
      nickname: string | null
      avatar: string | null
      isAuthor: boolean
      createdAt: string
      parentId: string | null
      replies: Array<{
        id: string
        content: string
        isAnonymous: boolean
        nickname: string | null
        avatar: string | null
        isAuthor: boolean
        createdAt: string
        parentId: string | null
        replies: []
      }>
    }>
    pagination: { page: number; limit: number; total: number }
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/${postId}/comments?page=${page}&limit=${limit}`)
    if (!res.ok) throw new Error(`获取评论失败: ${res.status}`)
    return res.json()
  },

  // Post comment (需登录)
  async postComment(postId: string, data: {
    openid: string
    content: string
    isAnonymous?: boolean
    parentId?: string | null
  }): Promise<ApiResponse<{
    comment: {
      id: string
      content: string
      isAnonymous: boolean
      nickname: string | null
      avatar: string | null
      isAuthor: boolean
      createdAt: string
      parentId: string | null
      replies: []
    }
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(`添加评论失败: ${res.status}`)
    return res.json()
  },

  // Get daily highlights (公开接口)
  async getDailyHighlights(): Promise<ApiResponse<{
    highlights: Array<{
      id: string
      sessionId: string
      storyTitle: string
      storySnippet: string
      nickname: string
      avatar: string | null
      likeCount: number
      commentCount: number
      createdAt: string
    }>
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/highlights`)
    if (!res.ok) throw new Error(`获取精选失败: ${res.status}`)
    return res.json()
  },

  // Delete my post (需登录)
  async deletePost(postId: string): Promise<ApiResponse<{ message: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/${postId}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`删除失败: ${res.status}`)
    return res.json()
  }
}

// Story Feedback API
export const storyFeedbackApi = {
  // Submit feedback
  async submit(params: {
    sessionId: string
    openid?: string
    overallRating: number
    elementRatings?: {
      character?: number
      location?: number
      object?: number
      emotion?: number
      plot?: number
    }
    comment?: string
  }): Promise<ApiResponse<{ submitted: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/story-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(params)
    })
    if (!res.ok) throw new Error(`提交反馈失败: ${res.status}`)
    return res.json()
  },

  // Get all feedbacks for a session
  async getAll(sessionId: string): Promise<ApiResponse<{
    feedbacks: Array<{
      id: string
      overallRating: number
      elementRatings: {
        character?: number
        location?: number
        object?: number
        emotion?: number
        plot?: number
      }
      comment?: string
      createdAt: string
    }>
    stats: {
      count: number
      overallAvg: number
      elementAvgs: {
        character?: number
        location?: number
        object?: number
        emotion?: number
        plot?: number
      }
    }
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/story-feedback/${sessionId}/all`)
    if (!res.ok) throw new Error(`获取反馈失败: ${res.status}`)
    return res.json()
  },

  // Check if user has submitted feedback for a session
  async check(sessionId: string, openid: string): Promise<ApiResponse<{
    hasSubmitted: boolean
    feedback: {
      id: string
      overallRating: number
      elementRatings: {
        character?: number
        location?: number
        object?: number
        emotion?: number
        plot?: number
      }
      comment?: string
      createdAt: string
    } | null
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/story-feedback/${sessionId}/check?openid=${encodeURIComponent(openid)}`)
    if (!res.ok) throw new Error(`检查反馈失败: ${res.status}`)
    return res.json()
  },

  // Get AI quality analytics
  async getAnalytics(): Promise<ApiResponse<{
    analytics: {
      totalFeedbacks: number
      overallAvg: number
      dimensionAvgs: {
        character: number | null
        location: number | null
        object: number | null
        emotion: number | null
        plot: number | null
      }
      ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
      weakestDimension: string | null
      weakestValue: number | null
      suggestions: string[]
    }
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/story-feedback/analytics`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取分析失败: ${res.status}`)
    return res.json()
  },

  // Get personalized recommendations
  async getRecommendations(openid: string): Promise<ApiResponse<{
    recommendations: Array<{
      id: string
      sessionId: string
      storyTitle: string
      storySnippet: string
      nickname: string
      likeCount: number
      commentCount: number
      createdAt: string
      score: number
      reason: string
    }>
    hasPreferences: boolean
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/story-feedback/recommendations?openid=${openid}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取推荐失败: ${res.status}`)
    return res.json()
  }
}

// Notification API
export interface Notification {
  id: string
  type: string
  fromOpenid: string
  fromNickname: string
  targetId: string | null
  targetTitle: string | null
  message: string
  isRead: boolean
  createdAt: string
}

export const notificationApi = {
  // Get notification list
  async getNotifications(page = 1, limit = 20): Promise<ApiResponse<{
    notifications: Notification[]
    unreadCount: number
    pagination: Pagination
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/notifications?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取通知列表失败: ${res.status}`)
    return res.json()
  },

  // Get unread count
  async getUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
    const res = await fetchWithTimeout(`${API_BASE}/notifications/unread-count`, {
      method: 'GET',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取未读数失败: ${res.status}`)
    return res.json()
  },

  // Mark all as read
  async markAllRead(): Promise<ApiResponse<{ marked: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/notifications/mark-read`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`标记已读失败: ${res.status}`)
    return res.json()
  },

  // Mark single notification as read
  async markOneRead(notificationId: string): Promise<ApiResponse<{ marked: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`标记已读失败: ${res.status}`)
    return res.json()
  }
}

// Message API
export interface Message {
  id: string
  fromOpenid: string
  toOpenid: string
  content: string
  isRead: boolean
  createdAt: string
  isMine: boolean
}

export interface Conversation {
  friendOpenid: string
  friendNickname: string | null
  friendAvatar: string | null
  lastMessage: {
    id: string
    content: string
    fromOpenid: string
    createdAt: string
    isRead: boolean
  } | null
  unreadCount: number
}

export const messageApi = {
  // Get conversation list
  async getConversations(): Promise<ApiResponse<{ conversations: Conversation[] }>> {
    const res = await fetchWithTimeout(`${API_BASE}/messages/conversations`, {
      method: 'GET',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取会话列表失败: ${res.status}`)
    return res.json()
  },

  // Get messages with a specific friend
  async getMessages(friendOpenid: string, page = 1, limit = 50): Promise<ApiResponse<{
    messages: Message[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }>> {
    const res = await fetchWithTimeout(
      `${API_BASE}/messages/${encodeURIComponent(friendOpenid)}?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: authHeaders()
      }
    )
    if (!res.ok) throw new Error(`获取消息失败: ${res.status}`)
    return res.json()
  },

  // Send a message
  async sendMessage(toOpenid: string, content: string): Promise<ApiResponse<{ message: Message }>> {
    const res = await fetchWithTimeout(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ toOpenid, content })
    })
    if (!res.ok) throw new Error(`发送消息失败: ${res.status}`)
    return res.json()
  },

  // Mark a message as read
  async markRead(messageId: string): Promise<ApiResponse<{ marked: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/messages/${messageId}/read`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`标记已读失败: ${res.status}`)
    return res.json()
  },

  // Delete a message (only sender can delete)
  async deleteMessage(messageId: string): Promise<ApiResponse<{ message: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/messages/${messageId}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`删除消息失败: ${res.status}`)
    return res.json()
  }
}

// Admin API
export interface AdminStats {
  pendingPosts: number
  totalPosts: number
  totalComments: number
  trends?: {
    postsLast7Days: number
    postsGrowth: number
    approvedLast7Days: number
    rejectedLast7Days: number
  }
  dailyStats?: DailyStat[]
}

export interface DailyStat {
  date: string
  dateLabel: string
  posts: number
  approved: number
  rejected: number
}

// Metrics API types
export interface MetricsSummary {
  totalRequests: number
  avgDuration: number
  totalSlow: number
  totalErrors: number
  maxDuration: number
  minDuration: number
}

export interface MetricsTrendPoint {
  date: string
  hour?: number
  requestCount: number
  avgDuration: number
  slowCount: number
  errorCount: number
  maxDuration: number
  minDuration: number
}

export interface SlowEndpoint {
  date: string
  endpoint: string
  method: string
  requestCount: number
  avgDuration: number
  slowCount: number
  errorCount: number
}

export interface PendingPost {
  id: string
  sessionId: string
  openid: string
  nickname: string
  avatar: string | null
  storyTitle: string
  storySnippet: string
  isAnonymous: boolean
  createdAt: string
}

export interface AdminComment {
  id: string
  wallId: string
  openid: string
  nickname: string
  content: string
  createdAt: string
  wallTitle: string
}

// Highlight Candidate types
export interface HighlightCandidate {
  id: string
  wallId: string
  engagementScore: number
  rank: number
  status: 'pending' | 'approved' | 'rejected'
  generatedAt: string
  reviewedAt: string | null
  reviewerOpenid: string | null
  // Post details
  storyTitle: string
  storySnippet: string
  nickname: string
  avatar: string | null
  likeCount: number
  commentCount: number
  createdAt: string
}

export const adminApi = {
  // Get admin stats
  async getStats(): Promise<ApiResponse<AdminStats>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/stats`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取统计数据失败: ${res.status}`)
    return res.json()
  },

  // Get pending posts
  async getPendingPosts(page = 1, limit = 20): Promise<ApiResponse<{
    posts: PendingPost[]
    pagination: { page: number; limit: number; total: number; hasMore: boolean }
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/posts/pending?page=${page}&limit=${limit}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取待审核帖子失败: ${res.status}`)
    return res.json()
  },

  // Approve post
  async approvePost(postId: string): Promise<ApiResponse<{ approved: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/posts/${postId}/approve`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`通过审核失败: ${res.status}`)
    return res.json()
  },

  // Reject post
  async rejectPost(postId: string, reason: string): Promise<ApiResponse<{ rejected: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/posts/${postId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ reason })
    })
    if (!res.ok) throw new Error(`拒绝审核失败: ${res.status}`)
    return res.json()
  },

  // Batch approve posts
  async batchApprovePosts(postIds: string[]): Promise<ApiResponse<{ approved: boolean; count: number }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/posts/batch-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ postIds })
    })
    if (!res.ok) throw new Error(`批量通过审核失败: ${res.status}`)
    return res.json()
  },

  // Batch reject posts
  async batchRejectPosts(postIds: string[], reason: string): Promise<ApiResponse<{ rejected: boolean; count: number }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/posts/batch-reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ postIds, reason })
    })
    if (!res.ok) throw new Error(`批量拒绝审核失败: ${res.status}`)
    return res.json()
  },

  // Get all comments
  async getComments(params: { page?: number; limit?: number; wallId?: string }): Promise<ApiResponse<{
    comments: AdminComment[]
    pagination: { page: number; limit: number; total: number; hasMore: boolean }
  }>> {
    const { page = 1, limit = 50, wallId } = params
    const queryParams = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (wallId) queryParams.set('wallId', wallId)
    const res = await fetchWithTimeout(`${API_BASE}/admin/comments?${queryParams}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取评论列表失败: ${res.status}`)
    return res.json()
  },

  // Delete comment
  async deleteComment(commentId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/comments/${commentId}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`删除评论失败: ${res.status}`)
    return res.json()
  },

  // Generate highlight candidates using algorithm
  async generateHighlightCandidates(): Promise<ApiResponse<{
    generated: number
    candidates: HighlightCandidate[]
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/highlights/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({})
    })
    if (!res.ok) throw new Error(`生成候选失败: ${res.status}`)
    return res.json()
  },

  // Get highlight candidates list
  async getHighlightCandidates(params: {
    status?: 'pending' | 'approved' | 'rejected'
    page?: number
    limit?: number
  }): Promise<ApiResponse<{
    candidates: HighlightCandidate[]
    pagination: { page: number; limit: number; total: number; hasMore: boolean }
  }>> {
    const { status = 'pending', page = 1, limit = 20 } = params
    const queryParams = new URLSearchParams({
      status,
      page: String(page),
      limit: String(limit)
    })
    const res = await fetchWithTimeout(`${API_BASE}/admin/highlights/candidates?${queryParams}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取候选列表失败: ${res.status}`)
    return res.json()
  },

  // Approve highlight candidate (mark as featured)
  async approveHighlightCandidate(candidateId: string): Promise<ApiResponse<{
    approved: boolean
    featured: boolean
    rewardPoints: number
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/highlights/${candidateId}/approve`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`确认候选失败: ${res.status}`)
    return res.json()
  },

  // Reject highlight candidate
  async rejectHighlightCandidate(candidateId: string): Promise<ApiResponse<{ rejected: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/highlights/${candidateId}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`拒绝候选失败: ${res.status}`)
    return res.json()
  },

  // Batch approve highlight candidates
  async batchApproveHighlightCandidates(candidateIds: string[]): Promise<ApiResponse<{
    approved: boolean
    count: number
    featured: number
    rewardPoints: number
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/highlights/batch-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ candidateIds })
    })
    if (!res.ok) throw new Error(`批量确认候选失败: ${res.status}`)
    return res.json()
  },

  // Get metrics summary
  async getMetricsSummary(startDate: string, endDate: string): Promise<ApiResponse<MetricsSummary>> {
    const res = await fetchWithTimeout(
      `${API_BASE}/metrics/summary?startDate=${startDate}&endDate=${endDate}`,
      { headers: authHeaders() }
    )
    if (!res.ok) throw new Error(`获取监控汇总失败: ${res.status}`)
    return res.json()
  },

  // Get metrics trend
  async getMetricsTrend(
    startDate: string,
    endDate: string,
    interval: 'hour' | 'day' = 'hour'
  ): Promise<ApiResponse<MetricsTrendPoint[]>> {
    const res = await fetchWithTimeout(
      `${API_BASE}/metrics/trend?startDate=${startDate}&endDate=${endDate}&interval=${interval}`,
      { headers: authHeaders() }
    )
    if (!res.ok) throw new Error(`获取监控趋势失败: ${res.status}`)
    return res.json()
  },

  // Get slowest endpoints
  async getSlowEndpoints(
    startDate: string,
    endDate: string,
    limit = 10,
    endpoint?: string
  ): Promise<ApiResponse<SlowEndpoint[]>> {
    let url = `${API_BASE}/metrics/slow?startDate=${startDate}&endDate=${endDate}&limit=${limit}`
    if (endpoint) {
      url += `&endpoint=${encodeURIComponent(endpoint)}`
    }
    const res = await fetchWithTimeout(url, { headers: authHeaders() })
    if (!res.ok) throw new Error(`获取慢接口失败: ${res.status}`)
    return res.json()
  }
}

// CheckIn API
export interface CheckInRecord {
  id: string
  date: string
  createdAt: string
}

export const checkInApi = {
  // Check in for today
  async checkIn(): Promise<ApiResponse<{
    consecutiveDays: number
    alreadyCheckedIn?: boolean
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/checkin`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`签到失败: ${res.status}`)
    return res.json()
  },

  // Get check-in status
  async getStatus(): Promise<ApiResponse<{
    checkedInToday: boolean
    consecutiveDays: number
  }>> {
    const res = await fetchWithTimeout(`${API_BASE}/checkin/status`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取签到状态失败: ${res.status}`)
    return res.json()
  },

  // Get check-in history
  async getHistory(): Promise<ApiResponse<{ records: CheckInRecord[] }>> {
    const res = await fetchWithTimeout(`${API_BASE}/checkin/history`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取签到记录失败: ${res.status}`)
    return res.json()
  }
}

export const achievementApi = {
  // Get user's achievements from server
  async getAchievements(): Promise<ApiResponse<{ medals: string[] }>> {
    const res = await fetchWithTimeout(`${API_BASE}/achievements`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取成就失败: ${res.status}`)
    return res.json()
  },

  // Sync achievements to server (merge with existing)
  async syncAchievements(medals: string[]): Promise<ApiResponse<{ medals: string[] }>> {
    const res = await fetchWithTimeout(`${API_BASE}/achievements/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ medals })
    })
    if (!res.ok) throw new Error(`同步成就失败: ${res.status}`)
    return res.json()
  }
}

// ============================================
// 图书馆 API
// ============================================

export interface LibraryCollection {
  id: string
  title: string
  description?: string
  cover?: string
  theme?: string
  storyCount: number
  createdAt: string
}

export interface LibraryEpisode {
  id: string
  order: number
  title: string
  excerpt?: string
  sessionId: string
  dreamFragment?: string
  createdAt: string
}

export interface LibraryCollectionDetail extends LibraryCollection {
  episodes: LibraryEpisode[]
}

export interface LibraryStats {
  totalCollections: number
  totalStories: number
  normalCount: number
  premiumCount: number
  curatedCount: number
}

export const libraryApi = {
  // 获取合集列表
  async getCollections(params?: {
    theme?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<{ collections: LibraryCollection[]; pagination: PaginationInfo }>> {
    const searchParams = new URLSearchParams()
    if (params?.theme) searchParams.set('theme', params.theme)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))

    const res = await fetchWithTimeout(`${API_BASE}/library/collections?${searchParams}`)
    if (!res.ok) throw new Error(`获取合集列表失败: ${res.status}`)
    return res.json()
  },

  // 获取合集详情
  async getCollectionDetail(id: string): Promise<ApiResponse<{ collection: LibraryCollectionDetail }>> {
    const res = await fetchWithTimeout(`${API_BASE}/library/collections/${id}`)
    if (!res.ok) throw new Error(`获取合集详情失败: ${res.status}`)
    return res.json()
  },

  // 获取图书馆统计
  async getStats(): Promise<ApiResponse<{ stats: LibraryStats }>> {
    const res = await fetchWithTimeout(`${API_BASE}/library/stats`)
    if (!res.ok) throw new Error(`获取统计数据失败: ${res.status}`)
    return res.json()
  }
}

// ============================================
// 图书馆管理员 API
// ============================================

export interface AdminAsset {
  id: string
  sessionId: string
  qualityLevel: 'normal' | 'premium' | 'curated'
  dreamFragment?: string
  createdAt: string
}

export interface AdminCollection {
  id: string
  title: string
  description?: string
  cover?: string
  theme?: string
  status: 'draft' | 'published'
  order: number
  storyCount: number
  createdAt: string
}

export interface AdminEpisode {
  id: string
  collectionId: string
  sessionId: string
  order: number
  title: string
  excerpt?: string
  createdAt: string
}

export const adminLibraryApi = {
  // 获取所有合集（管理员用）
  async getCollections(params?: {
    status?: 'draft' | 'published'
    page?: number
    limit?: number
  }): Promise<ApiResponse<{ collections: AdminCollection[]; pagination: PaginationInfo }>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))

    const res = await fetchWithTimeout(`${API_BASE}/admin/collections?${searchParams}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取合集列表失败: ${res.status}`)
    return res.json()
  },

  // 创建合集
  async createCollection(data: {
    title: string
    description?: string
    cover?: string
    theme?: string
    order?: number
  }): Promise<ApiResponse<{ collection: AdminCollection }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(`创建合集失败: ${res.status}`)
    return res.json()
  },

  // 更新合集
  async updateCollection(id: string, data: Partial<{
    title: string
    description: string
    cover: string
    theme: string
    status: 'draft' | 'published'
    order: number
  }>): Promise<ApiResponse<{ collection: AdminCollection }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/collections/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(`更新合集失败: ${res.status}`)
    return res.json()
  },

  // 删除合集
  async deleteCollection(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/collections/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`删除合集失败: ${res.status}`)
    return res.json()
  },

  // 添加章节到合集
  async addEpisode(collectionId: string, data: {
    sessionId: string
    title?: string
    excerpt?: string
    order?: number
  }): Promise<ApiResponse<{ episode: AdminEpisode }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/collections/${collectionId}/episodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ ...data, collectionId })
    })
    if (!res.ok) throw new Error(`添加章节失败: ${res.status}`)
    return res.json()
  },

  // 从合集移除章节
  async removeEpisode(collectionId: string, episodeId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await fetchWithTimeout(
      `${API_BASE}/admin/collections/${collectionId}/episodes/${episodeId}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    if (!res.ok) throw new Error(`移除章节失败: ${res.status}`)
    return res.json()
  },

  // 章节排序
  async reorderEpisodes(collectionId: string, episodeIds: string[]): Promise<ApiResponse<{ success: boolean }>> {
    const res = await fetchWithTimeout(
      `${API_BASE}/admin/collections/${collectionId}/episodes/reorder`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ episodeIds })
      }
    )
    if (!res.ok) throw new Error(`排序失败: ${res.status}`)
    return res.json()
  },

  // 获取故事资产列表（供管理员选择）
  async getAssets(params?: {
    quality?: 'normal' | 'premium' | 'curated'
    page?: number
    limit?: number
  }): Promise<ApiResponse<{ assets: AdminAsset[]; pagination: PaginationInfo }>> {
    const searchParams = new URLSearchParams()
    if (params?.quality) searchParams.set('quality', params.quality)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))

    const res = await fetchWithTimeout(`${API_BASE}/library/assets?${searchParams}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取故事列表失败: ${res.status}`)
    return res.json()
  },

  // 手动提升故事质量等级
  async upgradeAsset(sessionId: string, qualityLevel: 'normal' | 'premium' | 'curated'): Promise<ApiResponse<{ asset: AdminAsset }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/assets/${sessionId}/upgrade`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ qualityLevel })
    })
    if (!res.ok) throw new Error(`提升质量等级失败: ${res.status}`)
    return res.json()
  },

  // 自动升级达标故事
  async autoUpgrade(): Promise<ApiResponse<{ upgradedCount: number; totalScanned: number }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/assets/auto-upgrade`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`自动升级失败: ${res.status}`)
    return res.json()
  },

  // 生成候选列表
  async generateCandidates(): Promise<ApiResponse<{ generatedCount: number; totalScanned: number }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/assets/generate-candidates`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`生成候选失败: ${res.status}`)
    return res.json()
  },

  // 获取候选列表
  async getCandidates(params?: {
    status?: 'pending' | 'approved' | 'rejected' | 'all'
    page?: number
    limit?: number
  }): Promise<ApiResponse<{
    candidates: Array<{
      id: string
      sessionId: string
      storyTitle: string
      targetLevel: 'premium' | 'curated'
      likeCount: number
      commentCount: number
      engagementScore: number
      status: string
      generatedAt: string
    }>
    pagination: PaginationInfo
  }>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))

    const res = await fetchWithTimeout(`${API_BASE}/admin/assets/candidates?${searchParams}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取候选列表失败: ${res.status}`)
    return res.json()
  },

  // 确认候选
  async approveCandidate(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/assets/candidates/${sessionId}/approve`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`确认候选失败: ${res.status}`)
    return res.json()
  },

  // 拒绝候选
  async rejectCandidate(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/admin/assets/candidates/${sessionId}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`拒绝候选失败: ${res.status}`)
    return res.json()
  }
}

// Push notification API
export const pushApi = {
  // 获取订阅状态
  async getStatus(): Promise<ApiResponse<{ subscribed: boolean; endpoint?: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/push/status`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取订阅状态失败: ${res.status}`)
    return res.json()
  },

  // 订阅推送通知 (发送 subscription 对象)
  async subscribe(subscription: PushSubscriptionJSON): Promise<ApiResponse<{ message: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify(subscription)
    })
    if (!res.ok) throw new Error(`订阅失败: ${res.status}`)
    return res.json()
  },

  // 取消订阅
  async unsubscribe(endpoint: string): Promise<ApiResponse<{ message: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ endpoint })
    })
    if (!res.ok) throw new Error(`取消订阅失败: ${res.status}`)
    return res.json()
  },

  // 发送测试通知
  async sendTest(): Promise<ApiResponse<{ message: string }>> {
    const res = await fetchWithTimeout(`${API_BASE}/push/test`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`发送测试通知失败: ${res.status}`)
    return res.json()
  }
}
