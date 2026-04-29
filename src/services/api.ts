// Real API service - connects to Express backend
// In development, use mock API for UI testing

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const FETCH_TIMEOUT = 15000
const LONG_FETCH_TIMEOUT = 60000 // For AI generation endpoints (questions, story, interpretation)

// Get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('yeelin_token')
}

// Fetch with timeout using AbortSignal
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
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
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

// Common headers including auth
function authHeaders(): HeadersInit {
  const token = getAuthToken()
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

// Types
export interface User {
  id: string
  openid: string
  nickname?: string
  avatar?: string
  phone?: string
  isMember: boolean
  memberSince?: string
  points: number
  medals: string[]
  consecutiveShares: number
  lastShareDate?: string
}

export interface Friend {
  id: string
  friendId: string
  nickname?: string
  avatar?: string
  isMember: boolean
  memberSince?: string
  friendsSince: string
}

export interface PendingRequest {
  id: string
  fromId?: string
  toId?: string
  nickname?: string
  avatar?: string
  createdAt: string
}

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

export const api = {
  // Create session
  async createSession(openid: string): Promise<{ sessionId: string; status: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openid })
    })
    if (!res.ok) throw new Error(`创建会话失败: ${res.status}`)
    return res.json()
  },

  // Submit dream and get all questions
  async submitDream(sessionId: string, content: string): Promise<{ success: boolean; questions: string[]; questionIndex: number }> {
    const res = await fetchWithLongTimeout(`${API_BASE}/sessions/${sessionId}/dream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    if (!res.ok) throw new Error(`提交梦境失败: ${res.status}`)
    return res.json()
  },

  // Submit answer and get next question or story
  async submitAnswer(sessionId: string, answer: string): Promise<{
    success: boolean
    nextQuestion?: string
    nextIndex?: number
    story?: { title: string; content: string }
  }> {
    const res = await fetchWithLongTimeout(`${API_BASE}/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer })
    })
    if (!res.ok) throw new Error(`提交回答失败: ${res.status}`)
    return res.json()
  },

  // Get story
  async getStory(sessionId: string): Promise<{ story: { title: string; content: string } }> {
    const res = await fetchWithTimeout(`${API_BASE}/sessions/${sessionId}/story`)
    if (!res.ok) throw new Error(`获取故事失败: ${res.status}`)
    return res.json()
  },

  // Get user history
  async getHistory(openid: string): Promise<{ sessions: Array<{
    id: string
    date: string
    dreamFragment: string
    storyTitle: string
    story: string
  }> }> {
    const res = await fetchWithTimeout(`${API_BASE}/sessions/users/${openid}/history`)
    if (!res.ok) throw new Error(`获取历史失败: ${res.status}`)
    return res.json()
  },

  // Request dream interpretation
  async interpret(sessionId: string): Promise<{
    success: boolean
    interpretation?: string
    pointsUsed?: number
    remainingPoints?: number
    alreadyExists?: boolean
    reason?: string
  }> {
    const res = await fetchWithLongTimeout(`${API_BASE}/sessions/${sessionId}/interpret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      }
    })
    if (!res.ok) throw new Error(`请求解读失败: ${res.status}`)
    return res.json()
  },

  // Get existing interpretation
  async getInterpretation(sessionId: string): Promise<{ interpretation: string | null }> {
    const res = await fetchWithTimeout(`${API_BASE}/sessions/${sessionId}/interpretation`)
    if (!res.ok) throw new Error(`获取解读失败: ${res.status}`)
    return res.json()
  },

  // Migrate guest sessions to logged-in user
  async migrateSession(guestOpenid: string): Promise<{
    success: boolean
    migrated: number
    sessionIds?: string[]
    reason?: string
  }> {
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
    const token = getAuthToken()
    if (!token) throw new Error('Not authenticated')

    const res = await fetchWithTimeout(`${API_BASE}/auth/export-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
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
  success: boolean
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
  async logShare(openid: string, type: ShareType): Promise<ShareResult> {
    const res = await fetchWithTimeout(`${API_BASE}/share/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ openid, type })
    })
    if (!res.ok) throw new Error(`记录分享失败: ${res.status}`)
    return res.json()
  },

  // Get user sharing stats
  async getStats(openid: string): Promise<UserStats> {
    const res = await fetchWithTimeout(`${API_BASE}/share/stats/${openid}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取分享统计失败: ${res.status}`)
    return res.json()
  },

  // Create an invite code
  async createInvite(openid: string): Promise<{ success: boolean; inviteCode: string; inviteUrl: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/share/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ openid })
    })
    if (!res.ok) throw new Error(`创建邀请码失败: ${res.status}`)
    return res.json()
  },

  // Use an invite code (friend accepts invite)
  async useInvite(inviteCode: string, openid: string): Promise<{ success: boolean; inviterOpenid?: string; reason?: string }> {
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
  async wechatLogin(openid: string): Promise<{ success: boolean; user: User; token: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/wechat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openid })
    })
    if (!res.ok) throw new Error(`微信登录失败: ${res.status}`)
    return res.json()
  },

  // Phone + password login
  async phoneLogin(phone: string, password: string): Promise<{ success: boolean; user?: User; token?: string; reason?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/phone-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    })
    if (!res.ok) throw new Error(`手机登录失败: ${res.status}`)
    return res.json()
  },

  // Register with phone + password
  async register(phone: string, password: string, nickname?: string): Promise<{ success: boolean; user?: User; token?: string; reason?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, nickname })
    })
    if (!res.ok) throw new Error(`注册失败: ${res.status}`)
    return res.json()
  },

  // Update user profile
  async updateProfile(openid: string, data: { nickname?: string; avatar?: string }): Promise<{ success: boolean; user: User }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ openid, ...data })
    })
    if (!res.ok) throw new Error(`更新资料失败: ${res.status}`)
    return res.json()
  },

  // Get user by openid
  async getUser(openid: string): Promise<{ success: boolean; user: User }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/user/${openid}`)
    if (!res.ok) throw new Error(`获取用户失败: ${res.status}`)
    return res.json()
  },

  // Verify token
  async verifyToken(token: string): Promise<{ success: boolean; user?: User; reason?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    if (!res.ok) throw new Error(`验证Token失败: ${res.status}`)
    return res.json()
  }
}

// Friend API
export const friendApi = {
  // Send friend request
  async sendFriendRequest(friendOpenid: string): Promise<{ success: boolean; message: string; reason?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ friendOpenid })
    })
    if (!res.ok) throw new Error(`发送好友请求失败: ${res.status}`)
    return res.json()
  },

  // Accept friend request
  async acceptFriendRequest(requestId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ requestId })
    })
    if (!res.ok) throw new Error(`接受好友请求失败: ${res.status}`)
    return res.json()
  },

  // Reject friend request
  async rejectFriendRequest(requestId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ requestId })
    })
    if (!res.ok) throw new Error(`拒绝好友请求失败: ${res.status}`)
    return res.json()
  },

  // Remove friend
  async removeFriend(friendOpenid: string): Promise<{ success: boolean; message: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/${friendOpenid}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`删除好友失败: ${res.status}`)
    return res.json()
  },

  // Get friend list
  async getFriends(): Promise<{ success: boolean; friends: FriendListItem[] }> {
    const res = await fetchWithTimeout(`${API_BASE}/friends`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取好友列表失败: ${res.status}`)
    return res.json()
  },

  // Get pending friend requests
  async getFriendRequests(): Promise<{ success: boolean; requests: FriendRequestItem[] }> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/requests`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取好友请求失败: ${res.status}`)
    return res.json()
  },

  // Get sent friend requests
  async getSentRequests(): Promise<{ success: boolean; sentRequests: FriendRequestItem[] }> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/sent`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取发出的好友请求失败: ${res.status}`)
    return res.json()
  },

  // Get friend's public posts
  async getFriendPosts(openid: string, page = 1, limit = 20): Promise<{
    success: boolean
    posts: DreamWallPost[]
    pagination: { page: number; limit: number; total: number }
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/${openid}/posts?page=${page}&limit=${limit}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取好友发布失败: ${res.status}`)
    return res.json()
  },

  // Block user
  async blockUser(userId: string, blockedId: string): Promise<{ success: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/friends/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ userId, blockedId })
    })
    if (!res.ok) throw new Error(`拉黑用户失败: ${res.status}`)
    return res.json()
  },

  // Search users
  async searchUsers(query: string, excludeId?: string): Promise<{ success: boolean; users: Array<{ id: string; nickname?: string; avatar?: string; isMember: boolean }> }> {
    const params = new URLSearchParams({ query })
    if (excludeId) params.append('excludeId', excludeId)
    const res = await fetchWithTimeout(`${API_BASE}/friends/search?${params}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`搜索用户失败: ${res.status}`)
    return res.json()
  },

  // Get friend count
  async getFriendCount(userId: string): Promise<{ success: boolean; count: number }> {
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
  isAnonymous: boolean
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
  }): Promise<{
    posts: DreamWallPost[]
    pagination: { page: number; limit: number; total: number; hasMore: boolean }
  }> {
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
  }): Promise<{
    posts: DreamWallPost[]
    pagination: { page: number; limit: number; total: number; hasMore: boolean }
  }> {
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
  }): Promise<{ success: boolean; post?: { id: string }; message?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/wall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(params)
    })
    if (!res.ok) throw new Error(`发布到梦墙失败: ${res.status}`)
    return res.json()
  },

  // Get my posts (需登录)
  async getMyPosts(openid: string): Promise<{
    success: boolean
    posts: Array<{
      id: string
      sessionId: string
      storyTitle: string
      storySnippet: string
      storyFull?: string
      isAnonymous: boolean
      likeCount: number
      commentCount: number
      status: string
      isFeatured: boolean
      createdAt: string
    }>
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/my?openid=${openid}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取我的发布失败: ${res.status}`)
    return res.json()
  },

  // Toggle like (需登录)
  async toggleLike(postId: string, openid: string): Promise<{ success: boolean; liked: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ openid })
    })
    if (!res.ok) throw new Error(`点赞失败: ${res.status}`)
    return res.json()
  },

  // Toggle favorite (需登录)
  async toggleFavorite(postId: string, openid: string): Promise<{ success: boolean; favorited: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/${postId}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ openid })
    })
    if (!res.ok) throw new Error(`收藏失败: ${res.status}`)
    return res.json()
  },

  // Get favorites (需登录)
  async getFavorites(params: {
    page?: number
    limit?: number
  }): Promise<{
    posts: DreamWallPost[]
    pagination: { page: number; limit: number; total: number; hasMore: boolean }
  }> {
    const { page = 1, limit = 20 } = params
    const res = await fetchWithTimeout(`${API_BASE}/wall/favorites?page=${page}&limit=${limit}`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取收藏列表失败: ${res.status}`)
    return res.json()
  },

  // Get comments (public, no auth needed)
  async getComments(postId: string, page = 1, limit = 20): Promise<{
    success: boolean
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
  }> {
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
  }): Promise<{
    success: boolean
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
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/wall/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(`添加评论失败: ${res.status}`)
    return res.json()
  },

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
  }): Promise<{ success: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/story-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(params)
    })
    if (!res.ok) throw new Error(`提交反馈失败: ${res.status}`)
    return res.json()
  },

  // Get all feedbacks for a session
  async getAll(sessionId: string): Promise<{
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
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/story-feedback/${sessionId}/all`)
    if (!res.ok) throw new Error(`获取反馈失败: ${res.status}`)
    return res.json()
  },

  // Check if user has submitted feedback for a session
  async check(sessionId: string, openid: string): Promise<{
    success: boolean
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
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/story-feedback/${sessionId}/check?openid=${encodeURIComponent(openid)}`)
    if (!res.ok) throw new Error(`检查反馈失败: ${res.status}`)
    return res.json()
  },

  // Get AI quality analytics
  async getAnalytics(): Promise<{
    success: boolean
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
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/story-feedback/analytics`)
    if (!res.ok) throw new Error(`获取分析失败: ${res.status}`)
    return res.json()
  },

  // Get personalized recommendations
  async getRecommendations(openid: string): Promise<{
    success: boolean
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
  }> {
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
  async getNotifications(page = 1, limit = 20): Promise<{
    success: boolean
    notifications: Notification[]
    unreadCount: number
    pagination: { page: number; limit: number; total: number; hasMore: boolean }
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/notifications?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取通知列表失败: ${res.status}`)
    return res.json()
  },

  // Get unread count
  async getUnreadCount(): Promise<{ success: boolean; unreadCount: number }> {
    const res = await fetchWithTimeout(`${API_BASE}/notifications/unread-count`, {
      method: 'GET',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取未读数失败: ${res.status}`)
    return res.json()
  },

  // Mark all as read
  async markAllRead(): Promise<{ success: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/notifications/mark-read`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`标记已读失败: ${res.status}`)
    return res.json()
  },

  // Mark single notification as read
  async markOneRead(notificationId: string): Promise<{ success: boolean }> {
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
  async getConversations(): Promise<{ success: boolean; conversations: Conversation[] }> {
    const res = await fetchWithTimeout(`${API_BASE}/messages/conversations`, {
      method: 'GET',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取会话列表失败: ${res.status}`)
    return res.json()
  },

  // Get messages with a specific friend
  async getMessages(friendOpenid: string, page = 1, limit = 50): Promise<{
    success: boolean
    messages: Message[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }> {
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
  async sendMessage(toOpenid: string, content: string): Promise<{ success: boolean; message: Message }> {
    const res = await fetchWithTimeout(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ toOpenid, content })
    })
    if (!res.ok) throw new Error(`发送消息失败: ${res.status}`)
    return res.json()
  },

  // Mark a message as read
  async markRead(messageId: string): Promise<{ success: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/messages/${messageId}/read`, {
      method: 'POST',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`标记已读失败: ${res.status}`)
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
  async checkIn(): Promise<{
    success: boolean
    consecutiveDays: number
    alreadyCheckedIn?: boolean
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() }
    })
    if (!res.ok) throw new Error(`签到失败: ${res.status}`)
    return res.json()
  },

  // Get check-in status
  async getStatus(): Promise<{
    success: boolean
    checkedInToday: boolean
    consecutiveDays: number
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/checkin/status`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取签到状态失败: ${res.status}`)
    return res.json()
  },

  // Get check-in history
  async getHistory(): Promise<{
    success: boolean
    records: CheckInRecord[]
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/checkin/history`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error(`获取签到记录失败: ${res.status}`)
    return res.json()
  }
}
