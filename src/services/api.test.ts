import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Mock localStorage  
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: function(key: string) { return this.store[key] || null },
  setItem: function(key: string, value: string) { this.store[key] = value },
  removeItem: function(key: string) { delete this.store[key] },
  clear: function() { this.store = {} },
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
})

// ============================================================
// Helper function to create mock Response
// ============================================================
function createMockResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as unknown as Response
}

describe('api', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('createSession', () => {
    it('should create session successfully', async () => {
      const { api } = await import('./api')
      const mockData = { sessionId: 'sess_123', status: 'active' }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.createSession('openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/sessions`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ openid: 'openid_abc' }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { api } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(api.createSession('openid_abc')).rejects.toThrow('创建会话失败: 500')
    })
  })

  describe('submitDream', () => {
    it('should submit dream successfully', async () => {
      const { api } = await import('./api')
      const mockData = {
        success: true,
        questions: ['question1', 'question2'],
        questionIndex: 0,
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.submitDream('sess_123', 'I dreamed of flying')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/sessions/sess_123/dream`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'I dreamed of flying' }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { api } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 400))

      await expect(api.submitDream('sess_123', 'dream')).rejects.toThrow('提交梦境失败: 400')
    })
  })

  describe('submitAnswer', () => {
    it('should submit answer and get next question', async () => {
      const { api } = await import('./api')
      const mockData = {
        success: true,
        nextQuestion: 'What did you feel?',
        nextIndex: 1,
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.submitAnswer('sess_123', 'I felt happy')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/sessions/sess_123/answer`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: 'I felt happy' }),
        })
      )
    })

    it('should submit answer and get story', async () => {
      const { api } = await import('./api')
      const mockData = {
        success: true,
        story: { title: 'Flying Dream', content: 'Once upon a time...' },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.submitAnswer('sess_123', 'final answer')

      expect(result).toEqual(mockData)
    })

    it('should throw error on failure', async () => {
      const { api } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 400))

      await expect(api.submitAnswer('sess_123', 'answer')).rejects.toThrow('提交回答失败: 400')
    })
  })

  describe('getStory', () => {
    it('should get story successfully', async () => {
      const { api } = await import('./api')
      const mockData = { story: { title: 'My Dream', content: 'Story content...' } }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.getStory('sess_123')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/sess_123/story'),
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { api } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 404))

      await expect(api.getStory('sess_123')).rejects.toThrow('获取故事失败: 404')
    })
  })

  describe('getHistory', () => {
    it('should get history successfully', async () => {
      const { api } = await import('./api')
      const mockData = {
        sessions: [
          {
            id: 'sess_1',
            date: '2024-01-01',
            dreamFragment: 'I was flying',
            storyTitle: 'Flying',
            story: 'Story content',
          },
        ],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.getHistory('openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/users/openid_abc/history'),
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { api } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(api.getHistory('openid_abc')).rejects.toThrow('获取历史失败: 500')
    })
  })

  describe('interpret', () => {
    it('should request interpretation successfully', async () => {
      const { api } = await import('./api')
      const mockData = {
        success: true,
        interpretation: 'This dream means...',
        pointsUsed: 10,
        remainingPoints: 90,
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.interpret('sess_123', 'openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/sessions/sess_123/interpret`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ openid: 'openid_abc' }),
        })
      )
    })

    it('should handle already exists response', async () => {
      const { api } = await import('./api')
      const mockData = {
        success: false,
        alreadyExists: true,
        reason: 'Interpretation already exists',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.interpret('sess_123', 'openid_abc')

      expect(result).toEqual(mockData)
    })

    it('should throw error on failure', async () => {
      const { api } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(api.interpret('sess_123', 'openid_abc')).rejects.toThrow('请求解读失败: 500')
    })
  })

  describe('getInterpretation', () => {
    it('should get interpretation successfully', async () => {
      const { api } = await import('./api')
      const mockData = { interpretation: 'Your dream means...' }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.getInterpretation('sess_123')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/sess_123/interpretation'),
        expect.any(Object)
      )
    })

    it('should return null interpretation when not found', async () => {
      const { api } = await import('./api')
      const mockData = { interpretation: null }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.getInterpretation('sess_123')

      expect(result).toEqual(mockData)
    })

    it('should throw error on failure', async () => {
      const { api } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(api.getInterpretation('sess_123')).rejects.toThrow('获取解读失败: 500')
    })
  })

  describe('migrateSession', () => {
    it('should migrate session successfully', async () => {
      const { api } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true, migrated: 3, sessionIds: ['s1', 's2', 's3'] }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await api.migrateSession('guest_openid', 'user_openid')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/sessions/migrate`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({ guestOpenid: 'guest_openid', userOpenid: 'user_openid' }),
        })
      )
    })

    it('should throw error when not authenticated', async () => {
      const { api } = await import('./api')
      localStorageMock.removeItem('yeelin_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 401))

      await expect(api.migrateSession('guest', 'user')).rejects.toThrow('迁移会话失败: 401')
    })

    it('should throw error on failure', async () => {
      const { api } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 400))

      await expect(api.migrateSession('guest', 'user')).rejects.toThrow('迁移会话失败: 400')
    })
  })

  describe('exportData', () => {
    it('should export data successfully', async () => {
      const { api } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')

      const blob = new Blob(['test data'], { type: 'application/json' })
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        headers: new Headers({ 'Content-Disposition': 'attachment; filename="test.json"' }),
        blob: () => Promise.resolve(blob),
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      // Mock URL.createObjectURL and document.createElement
      const mockUrl = { revokeObjectURL: vi.fn() }
      const mockLink = { click: vi.fn(), href: '', download: '' }
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:test')
      globalThis.URL.revokeObjectURL = mockUrl.revokeObjectURL
      document.createElement = vi.fn(() => mockLink as unknown as HTMLAnchorElement)
      document.body.appendChild = vi.fn()
      document.body.removeChild = vi.fn()

      await api.exportData()

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/export-data`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error when not authenticated', async () => {
      const { api } = await import('./api')
      localStorageMock.removeItem('yeelin_token')

      await expect(api.exportData()).rejects.toThrow('Not authenticated')
    })
  })
})

describe('shareApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('logShare', () => {
    it('should log share successfully', async () => {
      const { shareApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        pointsEarned: 5,
        totalPoints: 100,
        consecutiveDays: 3,
        medalsUnlocked: ['share_3'],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await shareApi.logShare('openid_abc', 'poster')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/share/log`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({ openid: 'openid_abc', type: 'poster' }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { shareApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(shareApi.logShare('openid_abc', 'poster')).rejects.toThrow('记录分享失败: 500')
    })
  })

  describe('getStats', () => {
    it('should get stats successfully', async () => {
      const { shareApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        points: 100,
        medals: ['share_3', 'share_7'],
        consecutiveShares: 5,
        lastShareDate: '2024-01-01',
        todayShareCount: { poster: 1, moment: 0, link: 0, friend: 0 },
        dailyLimit: { poster: 3, moment: 3, link: 3, friend: 3 },
        inviteCode: 'ABC123',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await shareApi.getStats('openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/share/stats/openid_abc`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { shareApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(shareApi.getStats('openid_abc')).rejects.toThrow('获取分享统计失败: 500')
    })
  })

  describe('createInvite', () => {
    it('should create invite successfully', async () => {
      const { shareApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        inviteCode: 'XYZ789',
        inviteUrl: 'https://example.com/invite/XYZ789',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await shareApi.createInvite('openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/share/invite`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({ openid: 'openid_abc' }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { shareApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(shareApi.createInvite('openid_abc')).rejects.toThrow('创建邀请码失败: 500')
    })
  })

  describe('useInvite', () => {
    it('should use invite successfully', async () => {
      const { shareApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        inviterOpenid: 'inviter_abc',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await shareApi.useInvite('INVITE123', 'openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/share/use-invite`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({ inviteCode: 'INVITE123', openid: 'openid_abc' }),
        })
      )
    })

    it('should handle invalid invite code', async () => {
      const { shareApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: false,
        reason: 'Invalid invite code',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await shareApi.useInvite('INVALID', 'openid_abc')

      expect(result).toEqual(mockData)
    })

    it('should throw error on failure', async () => {
      const { shareApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(shareApi.useInvite('CODE', 'openid_abc')).rejects.toThrow('使用邀请码失败: 500')
    })
  })
})

describe('authApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('wechatLogin', () => {
    it('should login with WeChat successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = {
        success: true,
        user: {
          id: 'user_123',
          openid: 'openid_abc',
          nickname: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
          isMember: false,
          points: 50,
          medals: [],
          consecutiveShares: 0,
        },
        token: 'yeelin_token123',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.wechatLogin('openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/wechat`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ openid: 'openid_abc' }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { authApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(authApi.wechatLogin('openid_abc')).rejects.toThrow('微信登录失败: 500')
    })
  })

  describe('phoneLogin', () => {
    it('should login with phone successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = {
        success: true,
        user: {
          id: 'user_123',
          openid: 'openid_abc',
          phone: '1234567890',
          nickname: 'Test User',
          isMember: true,
          points: 100,
          medals: ['member'],
          consecutiveShares: 0,
        },
        token: 'yeelin_token456',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.phoneLogin('1234567890', 'password123')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/phone-login`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '1234567890', password: 'password123' }),
        })
      )
    })

    it('should handle invalid credentials', async () => {
      const { authApi } = await import('./api')
      const mockData = {
        success: false,
        reason: 'Invalid phone or password',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.phoneLogin('1234567890', 'wrongpassword')

      expect(result).toEqual(mockData)
    })

    it('should throw error on failure', async () => {
      const { authApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(authApi.phoneLogin('1234567890', 'password')).rejects.toThrow('手机登录失败: 500')
    })
  })

  describe('register', () => {
    it('should register successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = {
        success: true,
        user: {
          id: 'user_123',
          openid: 'openid_new',
          phone: '1234567890',
          nickname: 'New User',
          isMember: false,
          points: 50,
          medals: [],
          consecutiveShares: 0,
        },
        token: 'yeelin_token789',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.register('1234567890', 'password123', 'New User')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/register`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '1234567890', password: 'password123', nickname: 'New User' }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { authApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(authApi.register('1234567890', 'password', 'User')).rejects.toThrow('注册失败: 500')
    })
  })

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const { authApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        user: {
          id: 'user_123',
          openid: 'openid_abc',
          nickname: 'Updated Name',
          avatar: 'https://example.com/new_avatar.jpg',
          isMember: false,
          points: 50,
          medals: [],
          consecutiveShares: 0,
        },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.updateProfile('openid_abc', {
        nickname: 'Updated Name',
        avatar: 'https://example.com/new_avatar.jpg',
      })

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/update-profile`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({
            openid: 'openid_abc',
            nickname: 'Updated Name',
            avatar: 'https://example.com/new_avatar.jpg',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { authApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(authApi.updateProfile('openid_abc', { nickname: 'New' })).rejects.toThrow('更新资料失败: 500')
    })
  })

  describe('getUser', () => {
    it('should get user successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = {
        success: true,
        user: {
          id: 'user_123',
          openid: 'openid_abc',
          nickname: 'Test User',
          isMember: true,
          points: 200,
          medals: ['member'],
          consecutiveShares: 5,
        },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.getUser('openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/user/openid_abc'),
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { authApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(authApi.getUser('openid_abc')).rejects.toThrow('获取用户失败: 500')
    })
  })

  describe('verifyToken', () => {
    it('should verify token successfully', async () => {
      const { authApi } = await import('./api')
      const mockData = {
        success: true,
        user: {
          id: 'user_123',
          openid: 'openid_abc',
          nickname: 'Test User',
          isMember: true,
          points: 200,
          medals: ['member'],
          consecutiveShares: 5,
        },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.verifyToken('yeelin_token123')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/verify-token`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'yeelin_token123' }),
        })
      )
    })

    it('should handle invalid token', async () => {
      const { authApi } = await import('./api')
      const mockData = {
        success: false,
        reason: 'Token is invalid or expired',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await authApi.verifyToken('invalid_token')

      expect(result).toEqual(mockData)
    })

    it('should throw error on failure', async () => {
      const { authApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(authApi.verifyToken('token')).rejects.toThrow('验证Token失败: 500')
    })
  })
})

describe('friendApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('sendFriendRequest', () => {
    it('should send friend request successfully', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true, message: 'Friend request sent' }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.sendFriendRequest('friend_openid')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/friends/request`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({ friendOpenid: 'friend_openid' }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(friendApi.sendFriendRequest('friend_openid')).rejects.toThrow('发送好友请求失败: 500')
    })
  })

  describe('acceptFriendRequest', () => {
    it('should accept friend request successfully', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true, message: 'Friend request accepted' }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.acceptFriendRequest('request_123')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/friends/accept`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({ requestId: 'request_123' }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(friendApi.acceptFriendRequest('request_123')).rejects.toThrow('接受好友请求失败: 500')
    })
  })

  describe('rejectFriendRequest', () => {
    it('should reject friend request successfully', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true, message: 'Friend request rejected' }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.rejectFriendRequest('request_123')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/friends/reject`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({ requestId: 'request_123' }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(friendApi.rejectFriendRequest('request_123')).rejects.toThrow('拒绝好友请求失败: 500')
    })
  })

  describe('removeFriend', () => {
    it('should remove friend successfully', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true, message: 'Friend removed' }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.removeFriend('friend_openid')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/friends/friend_openid`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(friendApi.removeFriend('friend_openid')).rejects.toThrow('删除好友失败: 500')
    })
  })

  describe('getFriends', () => {
    it('should get friends list successfully', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        friends: [
          {
            id: 'f1',
            openid: 'friend1',
            nickname: 'Friend One',
            avatar: 'https://example.com/avatar1.jpg',
            friendSince: '2024-01-01',
          },
          {
            id: 'f2',
            openid: 'friend2',
            nickname: 'Friend Two',
            avatar: 'https://example.com/avatar2.jpg',
            friendSince: '2024-01-15',
          },
        ],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.getFriends()

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/friends`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(friendApi.getFriends()).rejects.toThrow('获取好友列表失败: 500')
    })
  })

  describe('getFriendRequests', () => {
    it('should get friend requests successfully', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        requests: [
          {
            id: 'req1',
            openid: 'user1',
            nickname: 'User One',
            avatar: 'https://example.com/avatar1.jpg',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.getFriendRequests()

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/friends/requests`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(friendApi.getFriendRequests()).rejects.toThrow('获取好友请求失败: 500')
    })
  })

  describe('getSentRequests', () => {
    it('should get sent requests successfully', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        sentRequests: [
          {
            id: 'req1',
            openid: 'user1',
            nickname: 'User One',
            avatar: 'https://example.com/avatar1.jpg',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.getSentRequests()

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/friends/sent`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(friendApi.getSentRequests()).rejects.toThrow('获取发出的好友请求失败: 500')
    })
  })

  describe('getFriendPosts', () => {
    it('should get friend posts successfully', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        posts: [
          {
            id: 'post1',
            sessionId: 'sess1',
            storyTitle: 'My Dream',
            storySnippet: 'Once upon a time...',
            isAnonymous: false,
            nickname: 'Friend',
            likeCount: 10,
            commentCount: 5,
            isFeatured: true,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1 },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.getFriendPosts('friend_openid', 1, 20)

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/friends/friend_openid/posts?page=1&limit=20`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(friendApi.getFriendPosts('friend_openid')).rejects.toThrow('获取好友发布失败: 500')
    })
  })

  describe('blockUser', () => {
    it('should block user successfully', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.blockUser('user_123', 'blocked_456')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/friends/block`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({ userId: 'user_123', blockedId: 'blocked_456' }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(friendApi.blockUser('user_123', 'blocked_456')).rejects.toThrow('拉黑用户失败: 500')
    })
  })

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        users: [
          {
            id: 'user1',
            nickname: 'Search Result',
            avatar: 'https://example.com/avatar.jpg',
            isMember: true,
          },
        ],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.searchUsers('search term')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends/search?query=search+term'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should search users with excludeId', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true, users: [] }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      await friendApi.searchUsers('search term', 'exclude_user_123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends/search?query=search+term&excludeId=exclude_user_123'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(friendApi.searchUsers('term')).rejects.toThrow('搜索用户失败: 500')
    })
  })

  describe('getFriendCount', () => {
    it('should get friend count successfully', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true, count: 42 }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await friendApi.getFriendCount('user_123')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/friends/count/user_123`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { friendApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(friendApi.getFriendCount('user_123')).rejects.toThrow('获取好友数量失败: 500')
    })
  })
})

describe('wallApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('getPosts', () => {
    it('should get posts successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = {
        posts: [
          {
            id: 'post1',
            sessionId: 'sess1',
            openid: 'user1',
            storyTitle: 'Flying Dream',
            storySnippet: 'I was flying over mountains...',
            isAnonymous: false,
            nickname: 'Dreamer',
            avatar: 'https://example.com/avatar.jpg',
            likeCount: 25,
            commentCount: 10,
            isFeatured: true,
            hasLiked: false,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, hasMore: false },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.getPosts({ tab: 'all', page: 1, limit: 20 })

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/wall?tab=all&page=1&limit=20'),
        expect.any(Object)
      )
    })

    it('should get featured posts', async () => {
      const { wallApi } = await import('./api')
      const mockData = {
        posts: [],
        pagination: { page: 1, limit: 20, total: 0, hasMore: false },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      await wallApi.getPosts({ tab: 'featured' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/wall?tab=featured&page=1&limit=20'),
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { wallApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(wallApi.getPosts({})).rejects.toThrow('获取梦墙失败: 500')
    })
  })

  describe('publish', () => {
    it('should publish successfully', async () => {
      const { wallApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        post: { id: 'new_post_123' },
        message: 'Published successfully',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.publish({
        openid: 'openid_abc',
        sessionId: 'sess_123',
        isAnonymous: false,
        visibility: 'public',
      })

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/wall`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({
            openid: 'openid_abc',
            sessionId: 'sess_123',
            isAnonymous: false,
            visibility: 'public',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { wallApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(wallApi.publish({ openid: 'o', sessionId: 's' })).rejects.toThrow('发布到梦墙失败: 500')
    })
  })

  describe('getMyPosts', () => {
    it('should get my posts successfully', async () => {
      const { wallApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        posts: [
          {
            id: 'post1',
            sessionId: 'sess1',
            storyTitle: 'My Dream',
            storySnippet: 'Once upon a time...',
            isAnonymous: false,
            likeCount: 10,
            commentCount: 5,
            status: 'published',
            isFeatured: true,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.getMyPosts('openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/wall/my?openid=openid_abc`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { wallApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(wallApi.getMyPosts('openid_abc')).rejects.toThrow('获取我的发布失败: 500')
    })
  })

  describe('toggleLike', () => {
    it('should toggle like successfully (like)', async () => {
      const { wallApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true, liked: true }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.toggleLike('post_123', 'openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/wall/post_123/like`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({ openid: 'openid_abc' }),
        })
      )
    })

    it('should toggle like successfully (unlike)', async () => {
      const { wallApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true, liked: false }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.toggleLike('post_123', 'openid_abc')

      expect(result).toEqual(mockData)
    })

    it('should throw error on failure', async () => {
      const { wallApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(wallApi.toggleLike('post_123', 'openid_abc')).rejects.toThrow('点赞失败: 500')
    })
  })

  describe('getComments', () => {
    it('should get comments successfully', async () => {
      const { wallApi } = await import('./api')
      const mockData = {
        success: true,
        comments: [
          {
            id: 'c1',
            content: 'Great dream!',
            isAnonymous: false,
            nickname: 'Commenter',
            avatar: 'https://example.com/avatar.jpg',
            isAuthor: false,
            createdAt: '2024-01-01T00:00:00Z',
            parentId: null,
            replies: [],
          },
        ],
        pagination: { page: 1, limit: 20, total: 1 },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.getComments('post_123', 1, 20)

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/wall/post_123/comments?page=1&limit=20'),
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { wallApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(wallApi.getComments('post_123')).rejects.toThrow('获取评论失败: 500')
    })
  })

  describe('postComment', () => {
    it('should post comment successfully', async () => {
      const { wallApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        comment: {
          id: 'new_comment_123',
          content: 'This is amazing!',
          isAnonymous: false,
          nickname: 'Me',
          avatar: 'https://example.com/my_avatar.jpg',
          isAuthor: true,
          createdAt: '2024-01-01T00:00:00Z',
          parentId: null,
          replies: [],
        },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.postComment('post_123', {
        openid: 'openid_abc',
        content: 'This is amazing!',
        isAnonymous: false,
      })

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/wall/post_123/comments`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({
            openid: 'openid_abc',
            content: 'This is amazing!',
            isAnonymous: false,
          }),
        })
      )
    })

    it('should post reply successfully', async () => {
      const { wallApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        comment: {
          id: 'reply_123',
          content: 'Thanks!',
          isAnonymous: true,
          nickname: null,
          avatar: null,
          isAuthor: false,
          createdAt: '2024-01-01T00:00:00Z',
          parentId: 'parent_comment_456',
          replies: [],
        },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await wallApi.postComment('post_123', {
        openid: 'openid_abc',
        content: 'Thanks!',
        isAnonymous: true,
        parentId: 'parent_comment_456',
      })

      expect(result).toEqual(mockData)
    })

    it('should throw error on failure', async () => {
      const { wallApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(wallApi.postComment('post_123', { openid: 'o', content: 'c' })).rejects.toThrow('添加评论失败: 500')
    })
  })
})

describe('storyFeedbackApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('submit', () => {
    it('should submit feedback successfully', async () => {
      const { storyFeedbackApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.submit({
        sessionId: 'sess_123',
        openid: 'openid_abc',
        overallRating: 5,
        elementRatings: {
          character: 4,
          location: 5,
          object: 4,
          emotion: 5,
          plot: 4,
        },
        comment: 'Great story!',
      })

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/story-feedback`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
          }),
          body: JSON.stringify({
            sessionId: 'sess_123',
            openid: 'openid_abc',
            overallRating: 5,
            elementRatings: {
              character: 4,
              location: 5,
              object: 4,
              emotion: 5,
              plot: 4,
            },
            comment: 'Great story!',
          }),
        })
      )
    })

    it('should submit feedback without optional fields', async () => {
      const { storyFeedbackApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.submit({
        sessionId: 'sess_123',
        overallRating: 4,
      })

      expect(result).toEqual(mockData)
    })

    it('should throw error on failure', async () => {
      const { storyFeedbackApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(storyFeedbackApi.submit({ sessionId: 'sess', overallRating: 5 })).rejects.toThrow('提交反馈失败: 500')
    })
  })

  describe('getAll', () => {
    it('should get all feedbacks successfully', async () => {
      const { storyFeedbackApi } = await import('./api')
      const mockData = {
        feedbacks: [
          {
            id: 'fb1',
            overallRating: 5,
            elementRatings: {
              character: 4,
              location: 5,
              object: 4,
              emotion: 5,
              plot: 4,
            },
            comment: 'Great!',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        stats: {
          count: 1,
          overallAvg: 5,
          elementAvgs: {
            character: 4,
            location: 5,
            object: 4,
            emotion: 5,
            plot: 4,
          },
        },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.getAll('sess_123')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/story-feedback/sess_123/all'),
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { storyFeedbackApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(storyFeedbackApi.getAll('sess_123')).rejects.toThrow('获取反馈失败: 500')
    })
  })

  describe('check', () => {
    it('should check feedback successfully (has submitted)', async () => {
      const { storyFeedbackApi } = await import('./api')
      const mockData = {
        success: true,
        hasSubmitted: true,
        feedback: {
          id: 'fb1',
          overallRating: 5,
          elementRatings: {
            character: 4,
            location: 5,
            object: 4,
            emotion: 5,
            plot: 4,
          },
          comment: 'Great!',
          createdAt: '2024-01-01T00:00:00Z',
        },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.check('sess_123', 'openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/story-feedback/sess_123/check?openid=openid_abc'),
        expect.any(Object)
      )
    })

    it('should check feedback (not submitted)', async () => {
      const { storyFeedbackApi } = await import('./api')
      const mockData = {
        success: true,
        hasSubmitted: false,
        feedback: null,
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.check('sess_123', 'openid_abc')

      expect(result).toEqual(mockData)
    })

    it('should throw error on failure', async () => {
      const { storyFeedbackApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(storyFeedbackApi.check('sess_123', 'openid')).rejects.toThrow('检查反馈失败: 500')
    })
  })

  describe('getAnalytics', () => {
    it('should get analytics successfully', async () => {
      const { storyFeedbackApi } = await import('./api')
      const mockData = {
        success: true,
        analytics: {
          totalFeedbacks: 100,
          overallAvg: 4.5,
          dimensionAvgs: {
            character: 4.2,
            location: 4.8,
            object: 4.5,
            emotion: 4.3,
            plot: 4.7,
          },
          ratingDistribution: { 1: 5, 2: 10, 3: 15, 4: 30, 5: 40 },
          weakestDimension: 'character',
          weakestValue: 4.2,
          suggestions: ['Improve character development', 'Add more vivid settings'],
        },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.getAnalytics()

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/story-feedback/analytics'),
        expect.any(Object)
      )
    })

    it('should throw error on failure', async () => {
      const { storyFeedbackApi } = await import('./api')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(storyFeedbackApi.getAnalytics()).rejects.toThrow('获取分析失败: 500')
    })
  })

  describe('getRecommendations', () => {
    it('should get recommendations successfully', async () => {
      const { storyFeedbackApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        recommendations: [
          {
            id: 'rec1',
            sessionId: 'sess1',
            storyTitle: 'Flying Adventure',
            storySnippet: 'You were flying over mountains...',
            nickname: 'Dreamer1',
            likeCount: 50,
            commentCount: 20,
            createdAt: '2024-01-01T00:00:00Z',
            score: 0.95,
            reason: 'Based on your preference for adventure stories',
          },
        ],
        hasPreferences: true,
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await storyFeedbackApi.getRecommendations('openid_abc')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/story-feedback/recommendations?openid=openid_abc`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { storyFeedbackApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(storyFeedbackApi.getRecommendations('openid_abc')).rejects.toThrow('获取推荐失败: 500')
    })
  })
})

describe('notificationApi', () => {
  const API_BASE = 'http://localhost:4000/api'

  describe('getNotifications', () => {
    it('should get notifications successfully', async () => {
      const { notificationApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = {
        success: true,
        notifications: [
          {
            id: 'notif1',
            type: 'friend_request',
            fromOpenid: 'user1',
            fromNickname: 'User One',
            targetId: 'req1',
            targetTitle: null,
            message: 'User One sent you a friend request',
            isRead: false,
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'notif2',
            type: 'like',
            fromOpenid: 'user2',
            fromNickname: 'User Two',
            targetId: 'post1',
            targetTitle: 'My Dream',
            message: 'User Two liked your dream',
            isRead: true,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        unreadCount: 1,
        pagination: { page: 1, limit: 20, total: 2, hasMore: false },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await notificationApi.getNotifications(1, 20)

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/notifications?page=1&limit=20`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { notificationApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(notificationApi.getNotifications()).rejects.toThrow('获取通知列表失败: 500')
    })
  })

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      const { notificationApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true, unreadCount: 5 }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await notificationApi.getUnreadCount()

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/notifications/unread-count`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { notificationApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(notificationApi.getUnreadCount()).rejects.toThrow('获取未读数失败: 500')
    })
  })

  describe('markAllRead', () => {
    it('should mark all as read successfully', async () => {
      const { notificationApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await notificationApi.markAllRead()

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/notifications/mark-read`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { notificationApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(notificationApi.markAllRead()).rejects.toThrow('标记已读失败: 500')
    })
  })

  describe('markOneRead', () => {
    it('should mark one as read successfully', async () => {
      const { notificationApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      const mockData = { success: true }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

      const result = await notificationApi.markOneRead('notif_123')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/notifications/notif_123/read`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      const { notificationApi } = await import('./api')
      localStorageMock.setItem('yeelin_token', 'test_token')
      mockFetch.mockResolvedValueOnce(createMockResponse(null, false, 500))

      await expect(notificationApi.markOneRead('notif_123')).rejects.toThrow('标记已读失败: 500')
    })
  })
})
