import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
const mockPrismaFriend = {
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn()
}

const mockPrismaUser = {
  findMany: vi.fn()
}

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    friend: mockPrismaFriend,
    user: mockPrismaUser,
    $transaction: vi.fn(async (ops) => {
      if (Array.isArray(ops)) {
        return Promise.all(ops)
      }
      return ops
    })
  }
}))

// Import after mocking
const { friendService } = await import('../../src/services/friendService.js')

describe('FriendService', () => {
  const TEST_USER_ID = 'user_cuid_123'
  const TEST_FRIEND_ID = 'friend_cuid_456'
  const TEST_FRIEND_USER = {
    id: TEST_FRIEND_ID,
    nickname: '测试好友',
    avatar: null,
    isMember: false,
    memberSince: null,
    createdAt: new Date()
  }
  const TEST_USER = {
    id: TEST_USER_ID,
    nickname: '测试用户',
    avatar: null,
    isMember: true,
    memberSince: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addFriend', () => {
    it('should reject adding self as friend', async () => {
      const result = await friendService.addFriend(TEST_USER_ID, TEST_USER_ID)
      expect(result.success).toBe(false)
      expect(result.reason).toBe('不能添加自己为好友')
    })

    it('should reject if already friends', async () => {
      mockPrismaFriend.findFirst.mockResolvedValue({
        id: 'rel_cuid',
        userId: TEST_USER_ID,
        friendId: TEST_FRIEND_ID,
        status: 'ACCEPTED'
      })

      const result = await friendService.addFriend(TEST_USER_ID, TEST_FRIEND_ID)
      expect(result.success).toBe(false)
      expect(result.reason).toBe('已经是好友了')
    })

    it('should reject if pending request exists', async () => {
      mockPrismaFriend.findFirst.mockResolvedValue({
        id: 'rel_cuid',
        userId: TEST_USER_ID,
        friendId: TEST_FRIEND_ID,
        status: 'PENDING'
      })

      const result = await friendService.addFriend(TEST_USER_ID, TEST_FRIEND_ID)
      expect(result.success).toBe(false)
      expect(result.reason).toBe('已发送过好友请求')
    })

    it('should reject if user is blocked', async () => {
      mockPrismaFriend.findFirst.mockResolvedValue({
        id: 'rel_cuid',
        userId: TEST_USER_ID,
        friendId: TEST_FRIEND_ID,
        status: 'BLOCKED'
      })

      const result = await friendService.addFriend(TEST_USER_ID, TEST_FRIEND_ID)
      expect(result.success).toBe(false)
      expect(result.reason).toBe('无法添加此好友')
    })

    it('should create friend request successfully', async () => {
      mockPrismaFriend.findFirst.mockResolvedValue(null)
      mockPrismaFriend.create.mockResolvedValue({
        id: 'new_rel_cuid',
        userId: TEST_USER_ID,
        friendId: TEST_FRIEND_ID,
        status: 'PENDING'
      })

      const result = await friendService.addFriend(TEST_USER_ID, TEST_FRIEND_ID)
      expect(result.success).toBe(true)
      expect(result.friend).toBeDefined()
      expect(mockPrismaFriend.create).toHaveBeenCalledWith({
        data: { userId: TEST_USER_ID, friendId: TEST_FRIEND_ID, status: 'PENDING' }
      })
    })
  })

  describe('acceptFriend', () => {
    it('should reject if no pending request exists', async () => {
      mockPrismaFriend.findFirst.mockResolvedValue(null)

      const result = await friendService.acceptFriend(TEST_USER_ID, TEST_FRIEND_ID)
      expect(result.success).toBe(false)
      expect(result.reason).toBe('没有待处理的好友请求')
    })

    it('should accept friend request successfully', async () => {
      const pendingRequest = {
        id: 'request_cuid',
        userId: TEST_FRIEND_ID,
        friendId: TEST_USER_ID,
        status: 'PENDING'
      }
      mockPrismaFriend.findFirst.mockResolvedValue(pendingRequest)
      mockPrismaFriend.update.mockResolvedValue({})
      mockPrismaFriend.upsert.mockResolvedValue({})

      const result = await friendService.acceptFriend(TEST_USER_ID, TEST_FRIEND_ID)
      expect(result.success).toBe(true)
    })
  })

  describe('rejectFriend', () => {
    it('should reject if no pending request exists', async () => {
      mockPrismaFriend.findFirst.mockResolvedValue(null)

      const result = await friendService.rejectFriend(TEST_USER_ID, TEST_FRIEND_ID)
      expect(result.success).toBe(false)
      expect(result.reason).toBe('没有待处理的好友请求')
    })

    it('should delete the friend request', async () => {
      const pendingRequest = {
        id: 'request_cuid',
        userId: TEST_FRIEND_ID,
        friendId: TEST_USER_ID,
        status: 'PENDING'
      }
      mockPrismaFriend.findFirst.mockResolvedValue(pendingRequest)
      mockPrismaFriend.delete.mockResolvedValue(pendingRequest)

      const result = await friendService.rejectFriend(TEST_USER_ID, TEST_FRIEND_ID)
      expect(result.success).toBe(true)
      expect(mockPrismaFriend.delete).toHaveBeenCalledWith({
        where: { id: 'request_cuid' }
      })
    })
  })

  describe('removeFriend', () => {
    it('should delete both friend relationships', async () => {
      mockPrismaFriend.deleteMany.mockResolvedValue({ count: 2 })

      const result = await friendService.removeFriend(TEST_USER_ID, TEST_FRIEND_ID)
      expect(result.success).toBe(true)
      expect(mockPrismaFriend.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { userId: TEST_USER_ID, friendId: TEST_FRIEND_ID },
            { userId: TEST_FRIEND_ID, friendId: TEST_USER_ID }
          ]
        }
      })
    })
  })

  describe('getFriends', () => {
    it('should return formatted friends list', async () => {
      mockPrismaFriend.findMany.mockResolvedValue([
        {
          id: 'rel1',
          userId: TEST_USER_ID,
          friendId: TEST_FRIEND_ID,
          status: 'ACCEPTED',
          user: TEST_USER,
          friend: TEST_FRIEND_USER,
          createdAt: new Date('2024-01-01')
        }
      ])

      const friends = await friendService.getFriends(TEST_USER_ID)
      expect(friends).toHaveLength(1)
      expect(friends[0].friendId).toBe(TEST_FRIEND_ID)
      expect(friends[0].nickname).toBe('测试好友')
    })

    it('should return empty array when no friends', async () => {
      mockPrismaFriend.findMany.mockResolvedValue([])

      const friends = await friendService.getFriends(TEST_USER_ID)
      expect(friends).toHaveLength(0)
    })
  })

  describe('getPendingRequests', () => {
    it('should return received and sent requests', async () => {
      mockPrismaFriend.findMany
        .mockResolvedValueOnce([
          {
            id: 'req1',
            userId: 'other_user',
            friendId: TEST_USER_ID,
            status: 'PENDING',
            user: { id: 'other_user', nickname: '发送者', avatar: null }
          }
        ])
        .mockResolvedValueOnce([
          {
            id: 'req2',
            userId: TEST_USER_ID,
            friendId: 'other_user',
            status: 'PENDING',
            friend: { id: 'other_user', nickname: '接收者', avatar: null }
          }
        ])

      const result = await friendService.getPendingRequests(TEST_USER_ID)

      expect(result.received).toHaveLength(1)
      expect(result.received[0].nickname).toBe('发送者')
      expect(result.sent).toHaveLength(1)
      expect(result.sent[0].nickname).toBe('接收者')
    })
  })

  describe('blockUser', () => {
    it('should delete existing relationships and create block', async () => {
      mockPrismaFriend.deleteMany.mockResolvedValue({ count: 1 })
      mockPrismaFriend.create.mockResolvedValue({
        id: 'block_cuid',
        userId: TEST_USER_ID,
        friendId: TEST_FRIEND_ID,
        status: 'BLOCKED'
      })

      const result = await friendService.blockUser(TEST_USER_ID, TEST_FRIEND_ID)
      expect(result.success).toBe(true)
      expect(mockPrismaFriend.deleteMany).toHaveBeenCalled()
      expect(mockPrismaFriend.create).toHaveBeenCalledWith({
        data: { userId: TEST_USER_ID, friendId: TEST_FRIEND_ID, status: 'BLOCKED' }
      })
    })
  })

  describe('searchUsers', () => {
    it('should return empty array for short query', async () => {
      const result = await friendService.searchUsers('a', TEST_USER_ID)
      expect(result).toHaveLength(0)
    })

    it('should search users by nickname', async () => {
      mockPrismaUser.findMany.mockResolvedValue([
        { id: 'found_user', nickname: '测试用户', avatar: null, isMember: false }
      ])

      const result = await friendService.searchUsers('测试', TEST_USER_ID)
      expect(result).toHaveLength(1)
      expect(result[0].nickname).toBe('测试用户')
    })

    it('should exclude current user from results', async () => {
      mockPrismaUser.findMany.mockResolvedValue([])

      await friendService.searchUsers('测试', TEST_USER_ID)
      expect(mockPrismaUser.findMany).toHaveBeenCalled()
    })

    it('should limit results to 20', async () => {
      mockPrismaUser.findMany.mockResolvedValue([])

      await friendService.searchUsers('测试', TEST_USER_ID)
      expect(mockPrismaUser.findMany).toHaveBeenCalled()
    })
  })

  describe('getFriendCount', () => {
    it('should return friend count', async () => {
      mockPrismaFriend.count.mockResolvedValue(5)

      const count = await friendService.getFriendCount(TEST_USER_ID)
      expect(count).toBe(5)
    })
  })
})
