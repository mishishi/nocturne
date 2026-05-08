import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Mock localStorage
let cookieStore = ''
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: function(key: string) { return this.store[key] || null },
  setItem: function(key: string, value: string) {
    this.store[key] = value
    // Sync yeelin_token to cookie for auth
    if (key === 'yeelin_token') {
      cookieStore = `yeelin_token=${value}; path=/`
    }
  },
  removeItem: function(key: string) {
    delete this.store[key]
    if (key === 'yeelin_token') {
      cookieStore = ''
    }
  },
  clear: function() { this.store = {} },
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock document.cookie for auth
Object.defineProperty(document, 'cookie', {
  get: function() { return cookieStore },
  set: function(val) {
    if (val.startsWith('yeelin_token=')) {
      const eqIdx = val.indexOf('=')
      const value = val.substring(eqIdx + 1).split(';')[0]
      cookieStore = `yeelin_token=${value}; path=/`
    }
  },
  configurable: true
})

beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
  cookieStore = ''
})

function setupLocalStorage(token: string, openid: string) {
  localStorageMock.store['yeelin_token'] = token
  localStorageMock.store['yeelin_openid'] = openid
  cookieStore = `yeelin_token=${token}; path=/`
}

function createMockResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as unknown as Response
}

describe('messageApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('getConversations', () => {
    it('should get conversation list successfully', async () => {
      const { messageApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          conversations: [
            {
              friendOpenid: 'friend_123',
              friendNickname: '测试好友',
              friendAvatar: 'https://example.com/avatar.jpg',
              lastMessage: {
                id: 'msg_1',
                content: '你好',
                fromOpenid: 'friend_123',
                createdAt: '2024-01-01T00:00:00Z',
                isRead: false
              },
              unreadCount: 2
            }
          ]
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await messageApi.getConversations()

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/messages/conversations`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { messageApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(messageApi.getConversations()).rejects.toThrow('获取会话列表失败: 500')
    })
  })

  describe('getMessages', () => {
    it('should get messages successfully', async () => {
      const { messageApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          messages: [
            {
              id: 'msg_1',
              fromOpenid: 'user_123',
              toOpenid: 'friend_456',
              content: '你好啊',
              createdAt: '2024-01-01T00:00:00Z',
              isRead: true
            }
          ],
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await messageApi.getMessages('friend_456', 1, 50)

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/messages/friend_456?page=1&limit=50`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { messageApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(messageApi.getMessages('friend_456')).rejects.toThrow('获取消息失败: 500')
    })
  })

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const { messageApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          message: {
            id: 'msg_new',
            fromOpenid: 'user_123',
            toOpenid: 'friend_456',
            content: '发送的消息',
            createdAt: '2024-01-01T00:00:00Z',
            isRead: false
          }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await messageApi.sendMessage('friend_456', '发送的消息')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/messages`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({ toOpenid: 'friend_456', content: '发送的消息' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { messageApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(messageApi.sendMessage('friend_456', 'test')).rejects.toThrow('发送消息失败: 500')
    })
  })

  describe('markRead', () => {
    it('should mark message as read successfully', async () => {
      const { messageApi } = await import('./api')
      const mockData = {
        success: true,
        data: { marked: true },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await messageApi.markRead('msg_123')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/messages/msg_123/read`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Authorization': 'Bearer test_token' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { messageApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(messageApi.markRead('msg_123')).rejects.toThrow('标记已读失败: 500')
    })
  })
})

describe('adminApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('getStats', () => {
    it('should get admin stats successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          pendingPosts: 5,
          totalPosts: 100,
          totalComments: 200,
          trends: {
            postsLast7Days: 20,
            postsGrowth: 15,
            approvedLast7Days: 18,
            rejectedLast7Days: 2
          }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.getStats()

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/stats`,
        expect.objectContaining({})
      )
      // Verify Authorization header was included
      const callArgs = mockFetch.mock.calls[0][1] as Record<string, unknown>
      expect(callArgs.headers).toMatchObject({ 'Authorization': 'Bearer test_token' })
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.getStats()).rejects.toThrow('获取统计数据失败: 500')
    })
  })
  describe('getPendingPosts', () => {
    it('should get pending posts successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          posts: [
            {
              id: 'post_123',
              sessionId: 'sess_456',
              openid: 'user_789',
              nickname: '测试用户',
              avatar: null,
              storyTitle: '我的梦境',
              storySnippet: '梦见自己在飞...',
              isAnonymous: false,
              createdAt: '2024-01-01T00:00:00Z'
            }
          ],
          pagination: { page: 1, limit: 20, total: 1, hasMore: false }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.getPendingPosts(1, 20)

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/posts/pending?page=1&limit=20`,
        expect.objectContaining({})
      )
      const callArgs2 = mockFetch.mock.calls[0][1] as Record<string, unknown>
      expect(callArgs2.headers).toMatchObject({ 'Authorization': 'Bearer test_token' })
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.getPendingPosts()).rejects.toThrow('获取待审核帖子失败: 500')
    })
  })
  describe('approvePost', () => {
    it('should approve post successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: { approved: true },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.approvePost('post_123')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/posts/post_123/approve`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Authorization': 'Bearer test_token' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.approvePost('post_123')).rejects.toThrow('通过审核失败: 500')
    })
  })

  describe('rejectPost', () => {
    it('should reject post successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: { rejected: true },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.rejectPost('post_123', '不合适的内容')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/posts/post_123/reject`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({ reason: '不合适的内容' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.rejectPost('post_123', '原因')).rejects.toThrow('拒绝审核失败: 500')
    })
  })
  describe('batchApprovePosts', () => {
    it('should batch approve posts successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: { approved: true, count: 3 },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.batchApprovePosts(['post_1', 'post_2', 'post_3'])

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/posts/batch-approve`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({ postIds: ['post_1', 'post_2', 'post_3'] })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.batchApprovePosts(['post_1'])).rejects.toThrow('批量通过审核失败: 500')
    })
  })

  describe('batchRejectPosts', () => {
    it('should batch reject posts successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: { rejected: true, count: 2 },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.batchRejectPosts(['post_1', 'post_2'], '不合适')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/posts/batch-reject`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({ postIds: ['post_1', 'post_2'], reason: '不合适' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.batchRejectPosts(['post_1'], '原因')).rejects.toThrow('批量拒绝审核失败: 500')
    })
  })
  describe('getComments', () => {
    it('should get comments successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          comments: [
            {
              id: 'comment_123',
              wallId: 'wall_456',
              openid: 'user_789',
              nickname: '评论者',
              content: '评论内容',
              createdAt: '2024-01-01T00:00:00Z',
              wallTitle: '梦境故事'
            }
          ],
          pagination: { page: 1, limit: 50, total: 1, hasMore: false }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.getComments({ page: 1, limit: 50 })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/comments?page=1&limit=50`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.getComments({})).rejects.toThrow('获取评论列表失败: 500')
    })
  })

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: { deleted: true },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.deleteComment('comment_123')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/comments/comment_123`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ 'Authorization': 'Bearer test_token' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.deleteComment('comment_123')).rejects.toThrow('删除评论失败: 500')
    })
  })
  describe('generateHighlightCandidates', () => {
    it('should generate highlight candidates successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          generated: 5,
          candidates: [
            {
              id: 'cand_1',
              wallId: 'wall_123',
              engagementScore: 100,
              rank: 1,
              status: 'pending',
              generatedAt: '2024-01-01T00:00:00Z',
              reviewedAt: null,
              reviewerOpenid: null,
              storyTitle: '奇异梦境',
              storySnippet: '梦见...',
              nickname: '用户1',
              avatar: null,
              likeCount: 50,
              commentCount: 10,
              createdAt: '2024-01-01T00:00:00Z'
            }
          ]
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.generateHighlightCandidates()

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/highlights/generate`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({})
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.generateHighlightCandidates()).rejects.toThrow('生成候选失败: 500')
    })
  })

  describe('getHighlightCandidates', () => {
    it('should get highlight candidates successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          candidates: [
            {
              id: 'cand_1',
              wallId: 'wall_123',
              engagementScore: 100,
              rank: 1,
              status: 'pending',
              generatedAt: '2024-01-01T00:00:00Z',
              reviewedAt: null,
              reviewerOpenid: null,
              storyTitle: '奇异梦境',
              storySnippet: '梦见...',
              nickname: '用户1',
              avatar: null,
              likeCount: 50,
              commentCount: 10,
              createdAt: '2024-01-01T00:00:00Z'
            }
          ],
          pagination: { page: 1, limit: 20, total: 1, hasMore: false }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.getHighlightCandidates({ status: 'pending', page: 1, limit: 20 })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/highlights/candidates?status=pending&page=1&limit=20`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.getHighlightCandidates({})).rejects.toThrow('获取候选列表失败: 500')
    })
  })
  describe('approveHighlightCandidate', () => {
    it('should approve highlight candidate successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          approved: true,
          featured: true,
          rewardPoints: 20
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.approveHighlightCandidate('cand_123')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/highlights/cand_123/approve`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Authorization': 'Bearer test_token' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.approveHighlightCandidate('cand_123')).rejects.toThrow('确认候选失败: 500')
    })
  })

  describe('rejectHighlightCandidate', () => {
    it('should reject highlight candidate successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: { rejected: true },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.rejectHighlightCandidate('cand_123')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/highlights/cand_123`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ 'Authorization': 'Bearer test_token' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.rejectHighlightCandidate('cand_123')).rejects.toThrow('拒绝候选失败: 500')
    })
  })

  describe('batchApproveHighlightCandidates', () => {
    it('should batch approve highlight candidates successfully', async () => {
      const { adminApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          approved: true,
          count: 3,
          featured: 3,
          rewardPoints: 60
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminApi.batchApproveHighlightCandidates(['cand_1', 'cand_2', 'cand_3'])

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/highlights/batch-approve`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({ candidateIds: ['cand_1', 'cand_2', 'cand_3'] })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminApi.batchApproveHighlightCandidates(['cand_1'])).rejects.toThrow('批量确认候选失败: 500')
    })
  })
}) // end adminApi

describe('checkInApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('checkIn', () => {
    it('should check in successfully', async () => {
      const { checkInApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          consecutiveDays: 3,
          alreadyCheckedIn: false
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await checkInApi.checkIn()

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/checkin`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Authorization': 'Bearer test_token' })
        })
      )
    })

    it('should handle already checked in', async () => {
      const { checkInApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          consecutiveDays: 3,
          alreadyCheckedIn: true
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await checkInApi.checkIn()

      expect(result.success).toBe(true)
    })

    it('should throw error on failure', async () => {
      const { checkInApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(checkInApi.checkIn()).rejects.toThrow('签到失败: 500')
    })
  })

  describe('getStatus', () => {
    it('should get check-in status successfully', async () => {
      const { checkInApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          checkedInToday: true,
          consecutiveDays: 5
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await checkInApi.getStatus()

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/checkin/status`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { checkInApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(checkInApi.getStatus()).rejects.toThrow('获取签到状态失败: 500')
    })
  })

  describe('getHistory', () => {
    it('should get check-in history successfully', async () => {
      const { checkInApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          records: [
            { id: 'record_1', date: '2024-01-01', createdAt: '2024-01-01T00:00:00Z' },
            { id: 'record_2', date: '2024-01-02', createdAt: '2024-01-02T00:00:00Z' }
          ]
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await checkInApi.getHistory()

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/checkin/history`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { checkInApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(checkInApi.getHistory()).rejects.toThrow('获取签到记录失败: 500')
    })
  })
}) // end checkInApi

describe('achievementApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('getAchievements', () => {
    it('should get achievements successfully', async () => {
      const { achievementApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          medals: ['first_dream', 'week_streak', 'share_master']
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await achievementApi.getAchievements()

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/achievements`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { achievementApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(achievementApi.getAchievements()).rejects.toThrow('获取成就失败: 500')
    })
  })

  describe('syncAchievements', () => {
    it('should sync achievements successfully', async () => {
      const { achievementApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          medals: ['first_dream', 'week_streak', 'new_medal']
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await achievementApi.syncAchievements(['first_dream', 'new_medal'])

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/achievements/sync`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({ medals: ['first_dream', 'new_medal'] })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { achievementApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(achievementApi.syncAchievements(['medal'])).rejects.toThrow('同步成就失败: 500')
    })
  })
}) // end achievementApi

describe('libraryApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('getCollections', () => {
    it('should get library collections successfully', async () => {
      const { libraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          collections: [
            {
              id: 'coll_1',
              title: '奇异梦境合集',
              description: '描述',
              cover: 'https://example.com/cover.jpg',
              theme: '冒险',
              storyCount: 12,
              createdAt: '2024-01-01T00:00:00Z'
            }
          ],
          pagination: { page: 1, limit: 20, total: 1, hasMore: false }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await libraryApi.getCollections({ page: 1, limit: 20 })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/library/collections?page=1&limit=20`,
        expect.any(Object)
      )
    })

    it('should get collections with theme filter', async () => {
      const { libraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          collections: [],
          pagination: { page: 1, limit: 20, total: 0, hasMore: false }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await libraryApi.getCollections({ theme: '冒险' })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/library/collections?theme=%E5%86%92%E9%99%A9`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { libraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(libraryApi.getCollections()).rejects.toThrow('获取合集列表失败: 500')
    })
  })

  describe('getCollectionDetail', () => {
    it('should get collection detail successfully', async () => {
      const { libraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          collection: {
            id: 'coll_1',
            title: '奇异梦境合集',
            description: '描述',
            cover: 'https://example.com/cover.jpg',
            theme: '冒险',
            storyCount: 3,
            createdAt: '2024-01-01T00:00:00Z',
            episodes: [
              {
                id: 'ep_1',
                order: 1,
                title: '第一章',
                excerpt: '节选内容...',
                sessionId: 'sess_123',
                createdAt: '2024-01-01T00:00:00Z'
              }
            ]
          }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await libraryApi.getCollectionDetail('coll_1')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/library/collections/coll_1`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { libraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(libraryApi.getCollectionDetail('coll_1')).rejects.toThrow('获取合集详情失败: 500')
    })
  })

  describe('getStats', () => {
    it('should get library stats successfully', async () => {
      const { libraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          stats: {
            totalCollections: 10,
            totalStories: 100,
            normalCount: 70,
            premiumCount: 20,
            curatedCount: 10
          }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await libraryApi.getStats()

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/library/stats`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { libraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(libraryApi.getStats()).rejects.toThrow('获取统计数据失败: 500')
    })
  })
}) // end libraryApi

describe('adminLibraryApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('getCollections', () => {
    it('should get admin collections successfully', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          collections: [
            {
              id: 'coll_1',
              title: '奇异梦境合集',
              description: '描述',
              cover: 'https://example.com/cover.jpg',
              theme: '冒险',
              status: 'published',
              order: 1,
              storyCount: 12,
              createdAt: '2024-01-01T00:00:00Z'
            }
          ],
          pagination: { page: 1, limit: 20, total: 1, hasMore: false }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.getCollections({ page: 1, limit: 20 })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/collections?page=1&limit=20`,
        expect.any(Object)
      )
    })

    it('should get collections with status filter', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          collections: [],
          pagination: { page: 1, limit: 20, total: 0, hasMore: false }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.getCollections({ status: 'draft' })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/collections?status=draft`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { adminLibraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminLibraryApi.getCollections()).rejects.toThrow('获取合集列表失败: 500')
    })
  })

  describe('createCollection', () => {
    it('should create collection successfully', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          collection: {
            id: 'coll_new',
            title: '新合集',
            description: '描述',
            cover: 'https://example.com/cover.jpg',
            theme: '冒险',
            status: 'draft',
            order: 1,
            storyCount: 0,
            createdAt: '2024-01-01T00:00:00Z'
          }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.createCollection({
        title: '新合集',
        description: '描述',
        theme: '冒险'
      })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/collections`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({ title: '新合集', description: '描述', theme: '冒险' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminLibraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminLibraryApi.createCollection({ title: '新合集' })).rejects.toThrow('创建合集失败: 500')
    })
  })

  describe('updateCollection', () => {
    it('should update collection successfully', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          collection: {
            id: 'coll_1',
            title: '更新后的标题',
            status: 'published'
          }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.updateCollection('coll_1', { title: '更新后的标题', status: 'published' })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/collections/coll_1`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({ title: '更新后的标题', status: 'published' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminLibraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminLibraryApi.updateCollection('coll_1', { title: '新标题' })).rejects.toThrow('更新合集失败: 500')
    })
  })

  describe('deleteCollection', () => {
    it('should delete collection successfully', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: { deleted: true },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.deleteCollection('coll_1')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/collections/coll_1`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ 'Authorization': 'Bearer test_token' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminLibraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminLibraryApi.deleteCollection('coll_1')).rejects.toThrow('删除合集失败: 500')
    })
  })

  describe('addEpisode', () => {
    it('should add episode to collection successfully', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          episode: {
            id: 'ep_new',
            collectionId: 'coll_1',
            sessionId: 'sess_123',
            order: 1,
            title: '新章节',
            excerpt: '章节节选',
            createdAt: '2024-01-01T00:00:00Z'
          }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.addEpisode('coll_1', {
        sessionId: 'sess_123',
        title: '新章节',
        excerpt: '章节节选',
        order: 1
      })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/collections/coll_1/episodes`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({ sessionId: 'sess_123', title: '新章节', excerpt: '章节节选', order: 1, collectionId: 'coll_1' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminLibraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminLibraryApi.addEpisode('coll_1', { sessionId: 'sess_123' })).rejects.toThrow('添加章节失败: 500')
    })
  })

  describe('removeEpisode', () => {
    it('should remove episode from collection successfully', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: { deleted: true },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.removeEpisode('coll_1', 'ep_1')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/collections/coll_1/episodes/ep_1`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ 'Authorization': 'Bearer test_token' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminLibraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminLibraryApi.removeEpisode('coll_1', 'ep_1')).rejects.toThrow('移除章节失败: 500')
    })
  })

  describe('reorderEpisodes', () => {
    it('should reorder episodes successfully', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: { success: true },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.reorderEpisodes('coll_1', ['ep_3', 'ep_1', 'ep_2'])

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/collections/coll_1/episodes/reorder`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({ episodeIds: ['ep_3', 'ep_1', 'ep_2'] })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminLibraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminLibraryApi.reorderEpisodes('coll_1', ['ep_1', 'ep_2'])).rejects.toThrow('排序失败: 500')
    })
  })

  describe('getAssets', () => {
    it('should get story assets successfully', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          assets: [
            {
              id: 'asset_1',
              sessionId: 'sess_123',
              qualityLevel: 'normal',
              dreamFragment: '梦见...',
              createdAt: '2024-01-01T00:00:00Z'
            }
          ],
          pagination: { page: 1, limit: 20, total: 1, hasMore: false }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.getAssets({ page: 1, limit: 20 })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/library/assets?page=1&limit=20`,
        expect.any(Object)
      )
    })

    it('should get assets with quality filter', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          assets: [],
          pagination: { page: 1, limit: 20, total: 0, hasMore: false }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.getAssets({ quality: 'premium' })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/library/assets?quality=premium`,
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { adminLibraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminLibraryApi.getAssets()).rejects.toThrow('获取故事列表失败: 500')
    })
  })

  describe('upgradeAsset', () => {
    it('should upgrade asset quality level successfully', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          asset: {
            id: 'asset_1',
            sessionId: 'sess_123',
            qualityLevel: 'premium',
            createdAt: '2024-01-01T00:00:00Z'
          }
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.upgradeAsset('sess_123', 'premium')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/assets/sess_123/upgrade`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
          }),
          body: JSON.stringify({ qualityLevel: 'premium' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminLibraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminLibraryApi.upgradeAsset('sess_123', 'premium')).rejects.toThrow('提升质量等级失败: 500')
    })
  })

  describe('autoUpgrade', () => {
    it('should auto upgrade assets successfully', async () => {
      const { adminLibraryApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          upgradedCount: 5,
          totalScanned: 100
        },
        timestamp: '2024-01-01T00:00:00Z'
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))
      localStorageMock.setItem('yeelin_token', 'test_token')

      const result = await adminLibraryApi.autoUpgrade()

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/admin/assets/auto-upgrade`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Authorization': 'Bearer test_token' })
        })
      )
    })

    it('should throw error on failure', async () => {
      const { adminLibraryApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))
      localStorageMock.setItem('yeelin_token', 'test_token')

      await expect(adminLibraryApi.autoUpgrade()).rejects.toThrow('自动升级失败: 500')
    })
  })
}) // end adminLibraryApi

describe('shareApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('logShare', () => {
    it('should log share successfully', async () => {
      const { shareApi } = await import('./api')
      const mockData = { success: true, data: { shared: true, pointsEarned: 5 } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await shareApi.logShare('openid_123', 'link')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/share/log`,
        expect.any(Object)
      )
    })
  })

  describe('getStats', () => {
    it('should get share stats successfully', async () => {
      const { shareApi } = await import('./api')
      const mockData = { success: true, data: { totalShares: 10, totalPoints: 50 } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await shareApi.getStats('openid_123')

      expect(result.success).toBe(true)
      expect(result.data.totalShares).toBe(10)
    })
  })

  describe('createInvite', () => {
    it('should create invite code successfully', async () => {
      const { shareApi } = await import('./api')
      const mockData = { success: true, data: { inviteCode: 'ABC123', inviteUrl: 'https://example.com/invite/ABC123' } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await shareApi.createInvite('openid_123')

      expect(result.success).toBe(true)
      expect(result.data.inviteCode).toBe('ABC123')
    })
  })

  describe('useInvite', () => {
    it('should use invite code successfully', async () => {
      const { shareApi } = await import('./api')
      const mockData = { success: true, data: { inviterOpenid: 'inviter_456' } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await shareApi.useInvite('CODE123', 'openid_789')

      expect(result.success).toBe(true)
      expect(result.data.inviterOpenid).toBe('inviter_456')
    })

    it('should throw error for invalid invite code', async () => {
      const { shareApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: false, error: '邀请码无效' }, false, 400))

      await expect(shareApi.useInvite('INVALID', 'openid_789')).rejects.toThrow('使用邀请码失败: 400')
    })
  })
})

describe('authApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('wechatLogin', () => {
    it('should login with WeChat successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = { success: true, data: { user: { id: 'u1', openid: 'wx_123', nickname: '微信用户' }, token: 'token_abc' } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.wechatLogin('wx_123')

      expect(result.success).toBe(true)
      expect(result.data.user.nickname).toBe('微信用户')
    })
  })

  describe('phoneLogin', () => {
    it('should login with phone successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = { success: true, data: { user: { id: 'u1', openid: 'phone_123', nickname: '手机用户' }, token: 'token_xyz' } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.phoneLogin('13800138000', 'password123')

      expect(result.success).toBe(true)
      expect(result.data.token).toBe('token_xyz')
    })

    it('should throw error for invalid credentials', async () => {
      const { authApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: false, error: '手机号或密码错误' }, false, 401))

      await expect(authApi.phoneLogin('13800138000', 'wrongpass')).rejects.toThrow('手机登录失败: 401')
    })
  })

  describe('register', () => {
    it('should register successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = { success: true, data: { user: { id: 'u1', openid: 'new_123', nickname: '新用户' }, token: 'token_new' } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.register('13800138000', 'password123', '新用户')

      expect(result.success).toBe(true)
      expect(result.data.user.nickname).toBe('新用户')
    })
  })

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = { success: true, data: { user: { id: 'u1', openid: 'openid_123', nickname: '更新后的昵称' } } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.updateProfile('openid_123', { nickname: '更新后的昵称' })

      expect(result.success).toBe(true)
      expect(result.data.user.nickname).toBe('更新后的昵称')
    })
  })

  describe('getUser', () => {
    it('should get user info successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = { success: true, data: { user: { id: 'u1', openid: 'openid_123', nickname: '用户', points: 100 } } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.getUser('openid_123')

      expect(result.success).toBe(true)
      expect(result.data.user.points).toBe(100)
    })
  })

  describe('verifyToken', () => {
    it('should verify token successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = { success: true, data: { user: { id: 'u1', openid: 'openid_123' } } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.verifyToken('valid_token')

      expect(result.success).toBe(true)
    })

    it('should throw error for invalid token', async () => {
      const { authApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: false, error: 'Token无效' }, false, 401))

      await expect(authApi.verifyToken('invalid_token')).rejects.toThrow('验证Token失败: 401')
    })
  })

  describe('sendResetCode', () => {
    it('should send reset code successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = { success: true, message: '验证码已发送' }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.sendResetCode('13800138000')

      expect(result.success).toBe(true)
    })
  })

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = { success: true, message: '密码重置成功' }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.resetPassword('13800138000', '123456', 'newpassword')

      expect(result.success).toBe(true)
    })
  })
})

describe('friendApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  setupLocalStorage('test_token', 'my_openid')

  describe('sendFriendRequest', () => {
    it('should send friend request successfully', async () => {
      const { friendApi } = await import('./api')
      const mockData = { success: true, data: { success: true } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.sendFriendRequest('friend_openid')

      expect(result.success).toBe(true)
    })
  })

  describe('acceptFriendRequest', () => {
    it('should accept friend request successfully', async () => {
      const { friendApi } = await import('./api')
      const mockData = { success: true, data: { success: true } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.acceptFriendRequest('request_123')

      expect(result.success).toBe(true)
    })
  })

  describe('rejectFriendRequest', () => {
    it('should reject friend request successfully', async () => {
      const { friendApi } = await import('./api')
      const mockData = { success: true, data: { success: true } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.rejectFriendRequest('request_456')

      expect(result.success).toBe(true)
    })
  })

  describe('removeFriend', () => {
    it('should remove friend successfully', async () => {
      const { friendApi } = await import('./api')
      const mockData = { success: true, data: { success: true } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.removeFriend('friend_openid')

      expect(result.success).toBe(true)
    })
  })

  describe('getFriends', () => {
    it('should get friend list successfully', async () => {
      const { friendApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          friends: [
            { openid: 'f1', nickname: '好友1', avatar: null },
            { openid: 'f2', nickname: '好友2', avatar: 'https://example.com/avatar.jpg' }
          ]
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.getFriends()

      expect(result.success).toBe(true)
      expect(result.data.friends.length).toBe(2)
    })
  })

  describe('getFriendRequests', () => {
    it('should get friend requests successfully', async () => {
      const { friendApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          requests: [
            { id: 'r1', fromOpenid: 'u1', fromNickname: '用户1', createdAt: '2024-01-01T00:00:00Z' }
          ]
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.getFriendRequests()

      expect(result.success).toBe(true)
      expect(result.data.requests.length).toBe(1)
    })
  })

  describe('getSentRequests', () => {
    it('should get sent requests successfully', async () => {
      const { friendApi } = await import('./api')
      const mockData = { success: true, data: { sentRequests: [] } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.getSentRequests()

      expect(result.success).toBe(true)
    })
  })

  describe('getFriendPosts', () => {
    it('should get friend posts successfully', async () => {
      const { friendApi } = await import('./api')
      const mockData = {
        success: true,
        data: { posts: [], pagination: { page: 1, limit: 20, total: 0, hasMore: false } }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.getFriendPosts('friend_openid')

      expect(result.success).toBe(true)
    })
  })

  describe('blockUser', () => {
    it('should block user successfully', async () => {
      const { friendApi } = await import('./api')
      const mockData = { success: true, data: { blocked: true } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.blockUser('my_id', 'user_to_block')

      expect(result.success).toBe(true)
      expect(result.data.blocked).toBe(true)
    })
  })

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      const { friendApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          users: [
            { id: 'u1', openid: 'o1', nickname: '搜索结果', avatar: null, isMember: false }
          ]
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.searchUsers('关键词')

      expect(result.success).toBe(true)
      expect(result.data.users.length).toBe(1)
    })
  })

  describe('getFriendCount', () => {
    it('should get friend count successfully', async () => {
      const { friendApi } = await import('./api')
      const mockData = { success: true, data: { count: 42 } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.getFriendCount('my_id')

      expect(result.success).toBe(true)
      expect(result.data.count).toBe(42)
    })
  })
})


describe('api (core session/story)', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('createSession', () => {
    it('should create session successfully', async () => {
      const { api } = await import('./api')
      const mockData = { success: true, data: { sessionId: 'sess_new_123', status: 'dream_submitted' } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.createSession('openid_123')

      expect(result.success).toBe(true)
      expect(result.data.sessionId).toBe('sess_new_123')
    })
  })

  describe('submitDream', () => {
    it('should submit dream successfully', async () => {
      const { api } = await import('./api')
      const mockData = {
        success: true,
        data: {
          questions: ['问题1', '问题2'],
          questionIndex: 0
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.submitDream('sess_123', '我梦见自己在飞', '奇幻')

      expect(result.success).toBe(true)
      expect(result.data.questions.length).toBe(2)
    })
  })

  describe('submitAnswer', () => {
    it('should submit answer successfully', async () => {
      const { api } = await import('./api')
      const mockData = {
        success: true,
        data: {
          nextQuestion: '下一个问题',
          nextIndex: 1,
          isLastQuestion: false
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.submitAnswer('sess_123', '我的答案')

      expect(result.success).toBe(true)
      expect(result.data.nextIndex).toBe(1)
    })

    it('should handle last question answered', async () => {
      const { api } = await import('./api')
      const mockData = {
        success: true,
        data: {
          isLastQuestion: true
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.submitAnswer('sess_123', '最后一个答案')

      expect(result.success).toBe(true)
      expect(result.data.isLastQuestion).toBe(true)
    })
  })

  describe('getStory', () => {
    it('should get story successfully', async () => {
      const { api } = await import('./api')
      const mockData = {
        success: true,
        data: {
          story: {
            title: '飞翔的梦境',
            content: '故事内容...'
          }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.getStory('sess_123')

      expect(result.success).toBe(true)
      expect(result.data.story.title).toBe('飞翔的梦境')
    })
  })

  describe('getHistory', () => {
    it('should get user history successfully', async () => {
      const { api } = await import('./api')
      const mockData = {
        success: true,
        data: {
          sessions: [
            { id: 's1', createdAt: '2024-01-01T00:00:00Z' },
            { id: 's2', createdAt: '2024-01-02T00:00:00Z' }
          ],
          pagination: { page: 1, limit: 20, total: 2, hasMore: false }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.getHistory('openid_123')

      expect(result.success).toBe(true)
      expect(result.data.sessions.length).toBe(2)
    })
  })

  describe('interpret', () => {
    it('should request interpretation successfully', async () => {
      setupLocalStorage('test_token', 'my_openid')
      const { api } = await import('./api')
      const mockData = {
        success: true,
        data: {
          interpretation: '这是你潜意识中的...',
          pointsUsed: 10,
          remainingPoints: 90
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.interpret('sess_123')

      expect(result.success).toBe(true)
      expect(result.data.pointsUsed).toBe(10)
    })
  })

  describe('getInterpretation', () => {
    it('should get interpretation successfully', async () => {
      setupLocalStorage('test_token', 'my_openid')
      const { api } = await import('./api')
      const mockData = {
        success: true,
        data: {
          interpretation: '梦境解读内容'
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.getInterpretation('sess_123')

      expect(result.success).toBe(true)
      expect(result.data.interpretation).toBe('梦境解读内容')
    })
  })

  describe('submitInterpretationFeedback', () => {
    it('should submit interpretation feedback successfully', async () => {
      setupLocalStorage('test_token', 'my_openid')
      const { api } = await import('./api')
      const mockData = {
        success: true,
        data: {
          feedback: {
            id: 'fb_123',
            isAccurate: true,
            comment: '很准确'
          }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.submitInterpretationFeedback('sess_123', true, '很准确')

      expect(result.success).toBe(true)
      expect(result.data.feedback.isAccurate).toBe(true)
    })
  })

  describe('getInterpretationFeedback', () => {
    it('should get interpretation feedback status successfully', async () => {
      setupLocalStorage('test_token', 'my_openid')
      const { api } = await import('./api')
      const mockData = {
        success: true,
        data: {
          feedback: {
            id: 'fb_123',
            isAccurate: true
          }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.getInterpretationFeedback('sess_123')

      expect(result.success).toBe(true)
      expect(result.data.feedback?.isAccurate).toBe(true)
    })

    it('should return null feedback when not yet submitted', async () => {
      setupLocalStorage('test_token', 'my_openid')
      const { api } = await import('./api')
      const mockData = {
        success: true,
        data: {
          feedback: null
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.getInterpretationFeedback('sess_123')

      expect(result.success).toBe(true)
      expect(result.data.feedback).toBeNull()
    })
  })

  describe('migrateSession', () => {
    it('should migrate guest sessions successfully', async () => {
      setupLocalStorage('test_token', 'my_openid')
      const { api } = await import('./api')
      const mockData = {
        success: true,
        data: {
          migrated: 3,
          sessionIds: ['s1', 's2', 's3']
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.migrateSession('guest_openid_123')

      expect(result.success).toBe(true)
      expect(result.data.migrated).toBe(3)
    })
  })
})

describe('apiWithRetry', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('publishStory', () => {
    it('should publish story successfully', async () => {
      const { apiWithRetry } = await import('./api')
      const mockData = { success: true, data: { post: { id: 'post_new' } } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await apiWithRetry.publishStory('openid_123', 'sess_456')

      expect(result.success).toBe(true)
      expect(result.data.post.id).toBe('post_new')
    })
  })

  describe('toggleStoryFavorite', () => {
    it('should toggle story favorite successfully', async () => {
      const { apiWithRetry } = await import('./api')
      const mockData = { success: true, data: { favorited: true } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await apiWithRetry.toggleStoryFavorite('sess_789')

      expect(result.success).toBe(true)
      expect(result.data.favorited).toBe(true)
    })
  })

  describe('syncAchievements', () => {
    it('should sync achievements successfully', async () => {
      const { apiWithRetry } = await import('./api')
      const mockData = { success: true, data: { medals: ['medal1', 'medal2'] } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await apiWithRetry.syncAchievements(['medal1', 'medal2'])

      expect(result.success).toBe(true)
      expect(result.data.medals.length).toBe(2)
    })
  })
})


describe('wallApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  setupLocalStorage('test_token', 'my_openid')

  describe('getPosts', () => {
    it('should get wall posts successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          posts: [
            { id: 'p1', content: '帖子1', author: { nickname: '用户1' } },
            { id: 'p2', content: '帖子2', author: { nickname: '用户2' } }
          ],
          pagination: { page: 1, limit: 20, total: 100, hasMore: true }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.getPosts({ page: 1, limit: 20 })

      expect(result.success).toBe(true)
      expect(result.data.posts.length).toBe(2)
      expect(result.data.pagination.hasMore).toBe(true)
    })

    it('should filter posts by theme', async () => {
      const { wallApi } = await import('./api')
      const mockData = { success: true, data: { posts: [], pagination: { page: 1, limit: 20, total: 0, hasMore: false } } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.getPosts({ theme: '冒险' })

      expect(result.success).toBe(true)
    })
  })

  describe('getFriendFeed', () => {
    it('should get friend feed successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          posts: [{ id: 'p1', content: '好友帖子' }],
          pagination: { page: 1, limit: 20, total: 1, hasMore: false }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.getFriendFeed({ page: 1 })

      expect(result.success).toBe(true)
    })
  })

  describe('publish', () => {
    it('should publish post successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = { success: true, data: { post: { id: 'new_post_123' } } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.publish({ openid: 'my_openid', sessionId: 'sess_123' })

      expect(result.success).toBe(true)
      expect(result.data.post.id).toBe('new_post_123')
    })
  })

  describe('getMyPosts', () => {
    it('should get my posts successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          posts: [{ id: 'm1', content: '我的帖子' }],
          pagination: { page: 1, limit: 20, total: 1, hasMore: false }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.getMyPosts('my_openid')

      expect(result.success).toBe(true)
    })
  })

  describe('toggleLike', () => {
    it('should toggle like successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = { success: true, data: { liked: true } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.toggleLike('post_123', 'my_openid')

      expect(result.success).toBe(true)
      expect(result.data.liked).toBe(true)
    })
  })

  describe('toggleFavorite', () => {
    it('should toggle favorite successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = { success: true, data: { favorited: true } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.toggleFavorite('post_123', 'my_openid')

      expect(result.success).toBe(true)
      expect(result.data.favorited).toBe(true)
    })
  })

  describe('toggleStoryFavorite', () => {
    it('should toggle story favorite successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = { success: true, data: { favorited: false } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.toggleStoryFavorite('session_456')

      expect(result.success).toBe(true)
      expect(result.data.favorited).toBe(false)
    })
  })

  describe('getStoryFavorites', () => {
    it('should get story favorites successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          stories: [{ sessionId: 's1', title: '故事1' }]
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.getStoryFavorites()

      expect(result.success).toBe(true)
      expect(result.data.stories.length).toBe(1)
    })
  })

  describe('getFavorites', () => {
    it('should get favorites successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          posts: [{ id: 'f1', content: '收藏' }],
          pagination: { page: 1, limit: 20, total: 1, hasMore: false }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.getFavorites({ page: 1, limit: 20 })

      expect(result.success).toBe(true)
    })
  })

  describe('getComments', () => {
    it('should get comments successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          comments: [
            { id: 'c1', content: '评论1', author: { nickname: '用户1' } }
          ],
          pagination: { page: 1, limit: 20, total: 1, hasMore: false }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.getComments('post_123')

      expect(result.success).toBe(true)
      expect(result.data.comments.length).toBe(1)
    })
  })

  describe('postComment', () => {
    it('should post comment successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = { success: true, data: { comment: { id: 'new_comment', content: '新评论' } } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.postComment('post_123', { content: '新评论' })

      expect(result.success).toBe(true)
      expect(result.data.comment.content).toBe('新评论')
    })
  })

  describe('getDailyHighlights', () => {
    it('should get daily highlights successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          highlights: [
            { id: 'h1', title: '精选1', coverUrl: 'https://example.com/cover.jpg' }
          ]
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.getDailyHighlights()

      expect(result.success).toBe(true)
      expect(result.data.highlights.length).toBe(1)
    })
  })
})


describe('storyFeedbackApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  setupLocalStorage('test_token', 'my_openid')

  describe('submit', () => {
    it('should submit story feedback successfully', async () => {
      const { storyFeedbackApi } = await import('./api')
      const mockData = { success: true, data: { submitted: true } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.submit({
        sessionId: 'sess_123',
        openid: 'my_openid',
        overallRating: 5,
        elementRatings: {
          character: 4,
          location: 5,
          plot: 4
        },
        comment: '故事很精彩'
      })

      expect(result.success).toBe(true)
      expect(result.data.submitted).toBe(true)
    })
  })

  describe('getAll', () => {
    it('should get all feedbacks for session successfully', async () => {
      const { storyFeedbackApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          feedbacks: [
            {
              id: 'fb_1',
              overallRating: 5,
              elementRatings: { character: 4, location: 5 },
              comment: '很棒',
              createdAt: '2024-01-01T00:00:00Z'
            }
          ],
          stats: {
            count: 1,
            overallAvg: 5,
            elementAvgs: { character: 4, location: 5, object: null, emotion: null, plot: null }
          }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.getAll('sess_123')

      expect(result.success).toBe(true)
      expect(result.data.feedbacks.length).toBe(1)
    })
  })

  describe('check', () => {
    it('should check feedback status successfully', async () => {
      const { storyFeedbackApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          hasSubmitted: true,
          feedback: {
            id: 'fb_123',
            overallRating: 4,
            elementRatings: { character: 4, location: 5, object: null, emotion: null, plot: null },
            comment: '不错',
            createdAt: '2024-01-01T00:00:00Z'
          }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.check('sess_123', 'my_openid')

      expect(result.success).toBe(true)
      expect(result.data.hasSubmitted).toBe(true)
      expect(result.data.feedback?.overallRating).toBe(4)
    })

    it('should return null feedback when not submitted', async () => {
      const { storyFeedbackApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          hasSubmitted: false,
          feedback: null
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.check('sess_456', 'my_openid')

      expect(result.success).toBe(true)
      expect(result.data.hasSubmitted).toBe(false)
      expect(result.data.feedback).toBeNull()
    })
  })

  describe('getAnalytics', () => {
    it('should get AI quality analytics successfully', async () => {
      const { storyFeedbackApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          analytics: {
            totalFeedbacks: 100,
            overallAvg: 4.5,
            dimensionAvgs: {
              character: 4.2,
              location: 4.8,
              object: 4.0,
              emotion: 4.5,
              plot: 4.3
            },
            ratingDistribution: { 1: 2, 2: 5, 3: 10, 4: 33, 5: 50 },
            weakestDimension: 'object',
            weakestValue: 4.0,
            suggestions: ['建议改进物品描'
            ]
          }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.getAnalytics()

      expect(result.success).toBe(true)
      expect(result.data.analytics.totalFeedbacks).toBe(100)
    })
  })

  describe('getRecommendations', () => {
    it('should get personalized recommendations successfully', async () => {
      const { storyFeedbackApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          recommendations: [
            {
              id: 'r1',
              sessionId: 'sess_1',
              storyTitle: '推荐故事',
              storySnippet: '故事片段...',
              nickname: '用户1',
              likeCount: 10,
              commentCount: 5,
              createdAt: '2024-01-01T00:00:00Z',
              score: 0.95,
              reason: '因为你喜欢奇幻类'
            }
          ],
          hasPreferences: true
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.getRecommendations('my_openid')

      expect(result.success).toBe(true)
      expect(result.data.recommendations.length).toBe(1)
      expect(result.data.hasPreferences).toBe(true)
    })
  })
})

describe('notificationApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  setupLocalStorage('test_token', 'my_openid')

  describe('getNotifications', () => {
    it('should get notification list successfully', async () => {
      const { notificationApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          notifications: [
            {
              id: 'n1',
              type: 'like',
              fromOpenid: 'user1',
              fromNickname: '用户1',
              targetId: 'post_123',
              targetTitle: '我的梦境',
              message: '点赞了你的帖子',
              isRead: false,
              createdAt: '2024-01-01T00:00:00Z'
            }
          ],
          unreadCount: 1,
          pagination: { page: 1, limit: 20, total: 1, hasMore: false }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await notificationApi.getNotifications()

      expect(result.success).toBe(true)
      expect(result.data.notifications.length).toBe(1)
      expect(result.data.unreadCount).toBe(1)
    })

    it('should handle empty notification list', async () => {
      const { notificationApi } = await import('./api')
      const mockData = {
        success: true,
        data: {
          notifications: [],
          unreadCount: 0,
          pagination: { page: 1, limit: 20, total: 0, hasMore: false }
        }
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await notificationApi.getNotifications()

      expect(result.success).toBe(true)
      expect(result.data.notifications.length).toBe(0)
      expect(result.data.unreadCount).toBe(0)
    })
  })

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      const { notificationApi } = await import('./api')
      const mockData = { success: true, data: { unreadCount: 5 } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await notificationApi.getUnreadCount()

      expect(result.success).toBe(true)
      expect(result.data.unreadCount).toBe(5)
    })
  })

  describe('markAllRead', () => {
    it('should mark all notifications as read successfully', async () => {
      const { notificationApi } = await import('./api')
      const mockData = { success: true, data: { marked: true } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await notificationApi.markAllRead()

      expect(result.success).toBe(true)
      expect(result.data.marked).toBe(true)
    })
  })

  describe('markOneRead', () => {
    it('should mark single notification as read successfully', async () => {
      const { notificationApi } = await import('./api')
      const mockData = { success: true, data: { marked: true } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await notificationApi.markOneRead('notif_123')

      expect(result.success).toBe(true)
      expect(result.data.marked).toBe(true)
    })
  })
})

afterAll(() => {
  localStorage.clear()
})
