import { prisma } from '../config/database.js'
import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'

export default async function friendRoutes(fastify) {
  // POST /api/friends/request - 发送好友请求 (需登录)
  fastify.post('/friends/request', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { friendOpenid } = req.body

    // Get authenticated user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send({ success: false, reason: '用户未找到' })
    }

    // Validate input
    if (!friendOpenid) {
      return res.status(400).send({ success: false, reason: '缺少 friendOpenid' })
    }

    // Check: not sending to self
    if (friendOpenid === tokenUser.openid) {
      return res.status(400).send({ success: false, reason: '不能添加自己为好友' })
    }

    // Find friend user by openid
    const friendUser = await prisma.user.findUnique({
      where: { openid: friendOpenid }
    })

    if (!friendUser) {
      return res.status(404).send({ success: false, reason: '用户不存在' })
    }

    // Check: no existing PENDING or ACCEPTED record
    const existingFriend = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: tokenUser.id, friendId: friendUser.id, status: 'ACCEPTED' },
          { userId: tokenUser.id, friendId: friendUser.id, status: 'PENDING' }
        ]
      }
    })

    if (existingFriend) {
      return res.status(409).send({ success: false, reason: '好友请求已存在' })
    }

    // Also check reverse direction
    const existingReverse = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: friendUser.id, friendId: tokenUser.id, status: 'ACCEPTED' },
          { userId: friendUser.id, friendId: tokenUser.id, status: 'PENDING' }
        ]
      }
    })

    if (existingReverse) {
      return res.status(409).send({ success: false, reason: '你们已经是好友或已有待处理请求' })
    }

    // Create Friend record with status: 'PENDING'
    const friend = await prisma.friend.create({
      data: {
        userId: tokenUser.id,
        friendId: friendUser.id,
        status: 'PENDING'
      }
    })

    return {
      success: true,
      requestId: friend.id
    }
  })

  // POST /api/friends/accept - 接受好友请求 (需登录)
  fastify.post('/friends/accept', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { requestId } = req.body

    // Get authenticated user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send({ success: false, reason: '用户未找到' })
    }

    // Validate input
    if (!requestId) {
      return res.status(400).send({ success: false, reason: '缺少 requestId' })
    }

    // Find the Friend record where friendId = current user and status = PENDING
    const friendRequest = await prisma.friend.findFirst({
      where: {
        id: requestId,
        friendId: tokenUser.id,
        status: 'PENDING'
      }
    })

    if (!friendRequest) {
      return res.status(404).send({ success: false, reason: '好友请求不存在或已处理' })
    }

    // Update status to ACCEPTED
    await prisma.friend.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' }
    })

    // Create reciprocal Friend record (current user -> them)
    await prisma.friend.create({
      data: {
        userId: tokenUser.id,
        friendId: friendRequest.userId,
        status: 'ACCEPTED'
      }
    })

    return {
      success: true
    }
  })

  // POST /api/friends/reject - 拒绝好友请求 (需登录)
  fastify.post('/friends/reject', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { requestId } = req.body

    // Get authenticated user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send({ success: false, reason: '用户未找到' })
    }

    // Validate input
    if (!requestId) {
      return res.status(400).send({ success: false, reason: '缺少 requestId' })
    }

    // Find the Friend record
    const friendRequest = await prisma.friend.findFirst({
      where: {
        id: requestId,
        friendId: tokenUser.id,
        status: 'PENDING'
      }
    })

    if (!friendRequest) {
      return res.status(404).send({ success: false, reason: '好友请求不存在或已处理' })
    }

    // Delete the Friend record
    await prisma.friend.delete({
      where: { id: requestId }
    })

    return {
      success: true
    }
  })

  // DELETE /api/friends/:friendOpenid - 删除好友 (需登录)
  fastify.delete('/friends/:friendOpenid', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { friendOpenid } = req.params

    // Get authenticated user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send({ success: false, reason: '用户未找到' })
    }

    // Validate input
    if (!friendOpenid) {
      return res.status(400).send({ success: false, reason: '缺少 friendOpenid' })
    }

    // Find friend user by openid
    const friendUser = await prisma.user.findUnique({
      where: { openid: friendOpenid }
    })

    if (!friendUser) {
      return res.status(404).send({ success: false, reason: '用户不存在' })
    }

    // Delete both Friend records (user->friend and friend->user)
    await prisma.friend.deleteMany({
      where: {
        OR: [
          { userId: tokenUser.id, friendId: friendUser.id },
          { userId: friendUser.id, friendId: tokenUser.id }
        ]
      }
    })

    return {
      success: true
    }
  })

  // GET /api/friends - 获取好友列表 (需登录)
  fastify.get('/friends', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    // Get authenticated user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send({ success: false, reason: '用户未找到' })
    }

    // Find all Friend records where userId = current user's id AND status = ACCEPTED
    const friends = await prisma.friend.findMany({
      where: {
        userId: tokenUser.id,
        status: 'ACCEPTED'
      },
      include: {
        friend: {
          select: {
            openid: true,
            nickname: true,
            avatar: true
          }
        }
      }
    })

    // Return list with friendSince date
    return {
      success: true,
      friends: friends.map(f => ({
        openid: f.friend.openid,
        nickname: f.friend.nickname,
        avatar: f.friend.avatar,
        friendSince: f.createdAt
      }))
    }
  })

  // GET /api/friends/requests - 获取待处理请求 (需登录)
  fastify.get('/friends/requests', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    // Get authenticated user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send({ success: false, reason: '用户未找到' })
    }

    // Find all Friend records where friendId = current user's id AND status = PENDING
    const requests = await prisma.friend.findMany({
      where: {
        friendId: tokenUser.id,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            openid: true,
            nickname: true,
            avatar: true
          }
        }
      }
    })

    // Return list with createdAt
    return {
      success: true,
      requests: requests.map(r => ({
        requestId: r.id,
        openid: r.user.openid,
        nickname: r.user.nickname,
        avatar: r.user.avatar,
        createdAt: r.createdAt
      }))
    }
  })

  // GET /api/friends/:openid/posts - 获取好友公开帖子 (需登录)
  fastify.get('/friends/:openid/posts', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { openid } = req.params
    const { page = 1, limit = 10 } = req.query

    // Get authenticated user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send({ success: false, reason: '用户未找到' })
    }

    // Validate input
    if (!openid) {
      return res.status(400).send({ success: false, reason: '缺少 openid' })
    }

    // Check: requesting user is friends with :openid (has ACCEPTED record)
    const friendUser = await prisma.user.findUnique({
      where: { openid }
    })

    if (!friendUser) {
      return res.status(404).send({ success: false, reason: '用户不存在' })
    }

    const friendship = await prisma.friend.findFirst({
      where: {
        userId: tokenUser.id,
        friendId: friendUser.id,
        status: 'ACCEPTED'
      }
    })

    if (!friendship) {
      return res.status(403).send({ success: false, reason: '你们不是好友关系' })
    }

    // Query DreamWall where openid = :openid, visibility = 'public', status = 'approved'
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const posts = await prisma.dreamWall.findMany({
      where: {
        openid: openid,
        visibility: 'public',
        status: 'approved'
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    })

    const total = await prisma.dreamWall.count({
      where: {
        openid: openid,
        visibility: 'public',
        status: 'approved'
      }
    })

    return {
      success: true,
      posts: posts.map(p => ({
        id: p.id,
        sessionId: p.sessionId,
        storyTitle: p.storyTitle,
        storySnippet: p.storySnippet,
        nickname: p.isAnonymous ? '匿名用户' : p.nickname,
        avatar: p.isAnonymous ? null : p.avatar,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        createdAt: p.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    }
  })
}
