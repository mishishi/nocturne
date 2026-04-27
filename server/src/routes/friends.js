import { friendService } from '../services/friendService.js'
import { authMiddleware } from '../middleware/auth.js'
import { authService } from '../services/authService.js'

export default async function friendRoutes(fastify) {
  // POST /api/friends/add - 添加好友 (需登录)
  fastify.post('/friends/add', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { userId, friendId } = req.body

    // Verify the userId matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== userId) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!userId || !friendId) {
      return res.status(400).send({ error: 'userId and friendId are required' })
    }

    try {
      const result = await friendService.addFriend(userId, friendId)
      if (!result.success) {
        return res.status(400).send(result)
      }
      return { success: true }
    } catch (error) {
      console.error('Add friend error:', error)
      return res.status(500).send({ error: '添加好友失败' })
    }
  })

  // POST /api/friends/accept - 接受好友请求 (需登录)
  fastify.post('/friends/accept', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { userId, friendId } = req.body

    // Verify the userId matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== userId) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!userId || !friendId) {
      return res.status(400).send({ error: 'userId and friendId are required' })
    }

    try {
      const result = await friendService.acceptFriend(userId, friendId)
      if (!result.success) {
        return res.status(400).send(result)
      }
      return { success: true }
    } catch (error) {
      console.error('Accept friend error:', error)
      return res.status(500).send({ error: '接受好友请求失败' })
    }
  })

  // POST /api/friends/reject - 拒绝好友请求 (需登录)
  fastify.post('/friends/reject', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { userId, friendId } = req.body

    // Verify the userId matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== userId) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!userId || !friendId) {
      return res.status(400).send({ error: 'userId and friendId are required' })
    }

    try {
      const result = await friendService.rejectFriend(userId, friendId)
      if (!result.success) {
        return res.status(400).send(result)
      }
      return { success: true }
    } catch (error) {
      console.error('Reject friend error:', error)
      return res.status(500).send({ error: '拒绝好友请求失败' })
    }
  })

  // POST /api/friends/remove - 删除好友 (需登录)
  fastify.post('/friends/remove', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { userId, friendId } = req.body

    // Verify the userId matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== userId) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!userId || !friendId) {
      return res.status(400).send({ error: 'userId and friendId are required' })
    }

    try {
      const result = await friendService.removeFriend(userId, friendId)
      return { success: true }
    } catch (error) {
      console.error('Remove friend error:', error)
      return res.status(500).send({ error: '删除好友失败' })
    }
  })

  // GET /api/friends/list/:userId - 获取好友列表 (需登录)
  fastify.get('/friends/list/:userId', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { userId } = req.params

    // Verify the userId matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== userId) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!userId) {
      return res.status(400).send({ error: 'userId is required' })
    }

    try {
      const friends = await friendService.getFriends(userId)
      return { success: true, friends }
    } catch (error) {
      console.error('Get friends error:', error)
      return res.status(500).send({ error: '获取好友列表失败' })
    }
  })

  // GET /api/friends/requests/:userId - 获取待处理请求 (需登录)
  fastify.get('/friends/requests/:userId', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { userId } = req.params

    // Verify the userId matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== userId) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!userId) {
      return res.status(400).send({ error: 'userId is required' })
    }

    try {
      const requests = await friendService.getPendingRequests(userId)
      return { success: true, ...requests }
    } catch (error) {
      console.error('Get pending requests error:', error)
      return res.status(500).send({ error: '获取好友请求失败' })
    }
  })

  // POST /api/friends/block - 拉黑用户 (需登录)
  fastify.post('/friends/block', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { userId, blockedId } = req.body

    // Verify the userId matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== userId) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!userId || !blockedId) {
      return res.status(400).send({ error: 'userId and blockedId are required' })
    }

    try {
      const result = await friendService.blockUser(userId, blockedId)
      return { success: true }
    } catch (error) {
      console.error('Block user error:', error)
      return res.status(500).send({ error: '拉黑用户失败' })
    }
  })

  // GET /api/friends/search - 搜索用户 (需登录)
  fastify.get('/friends/search', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { query, excludeId } = req.query

    if (!query) {
      return res.status(400).send({ error: 'query is required' })
    }

    try {
      const users = await friendService.searchUsers(query, excludeId)
      return { success: true, users }
    } catch (error) {
      console.error('Search users error:', error)
      return res.status(500).send({ error: '搜索用户失败' })
    }
  })

  // GET /api/friends/count/:userId - 获取好友数量 (需登录)
  fastify.get('/friends/count/:userId', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { userId } = req.params

    // Verify the userId matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== userId) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (!userId) {
      return res.status(400).send({ error: 'userId is required' })
    }

    try {
      const count = await friendService.getFriendCount(userId)
      return { success: true, count }
    } catch (error) {
      console.error('Get friend count error:', error)
      return res.status(500).send({ error: '获取好友数量失败' })
    }
  })
}
