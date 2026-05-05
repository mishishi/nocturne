import { prisma } from '../config/database.js'
import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'
import { createNotification } from '../services/notificationService.js'
import { successResponse, errorResponse } from '../config/response.js'

export default async function friendRoutes(fastify) {
  // POST /api/friends/request - 发送好友请求 (需登录)
  fastify.post('/friends/request', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { friendOpenid } = req.body

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Validate input
      if (!friendOpenid) {
        return res.status(400).send(errorResponse('缺少 friendOpenid', 'MISSING_PARAMS'))
      }

      // Check: not sending to self
      if (friendOpenid === tokenUser.openid) {
        return res.status(400).send(errorResponse('不能添加自己为好友', 'INVALID_REQUEST'))
      }

      // Find friend user by openid
      const friendUser = await prisma.user.findUnique({
        where: { openid: friendOpenid }
      })

      if (!friendUser) {
        return res.status(404).send(errorResponse('用户不存在', 'USER_NOT_FOUND'))
      }

      // Create Friend record with status: 'PENDING' atomically
      const friend = await prisma.$transaction(async (tx) => {
        // Check: no existing PENDING or ACCEPTED record
        const existingFriend = await tx.friend.findFirst({
          where: {
            OR: [
              { userId: tokenUser.id, friendId: friendUser.id, status: 'ACCEPTED' },
              { userId: tokenUser.id, friendId: friendUser.id, status: 'PENDING' }
            ]
          }
        })

        if (existingFriend) {
          throw new Error('好友请求已存在')
        }

        // Also check reverse direction
        const existingReverse = await tx.friend.findFirst({
          where: {
            OR: [
              { userId: friendUser.id, friendId: tokenUser.id, status: 'ACCEPTED' },
              { userId: friendUser.id, friendId: tokenUser.id, status: 'PENDING' }
            ]
          }
        })

        if (existingReverse) {
          throw new Error('你们已经是好友或已有待处理请求')
        }

        // Create Friend record with status: 'PENDING'
        return tx.friend.create({
          data: {
            userId: tokenUser.id,
            friendId: friendUser.id,
            status: 'PENDING'
          }
        })
      })

      // Create FRIEND_REQUEST notification for the target user (fire-and-forget)
      createNotification(prisma, {
        openid: friendUser.openid,
        type: 'FRIEND_REQUEST',
        fromOpenid: tokenUser.openid,
        fromNickname: tokenUser.nickname,
        targetId: null,
        targetTitle: null,
        message: tokenUser.nickname + ' 申请加你为好友'
      }).catch(err => {
        console.error('Failed to create FRIEND_REQUEST notification', err)
      })

      return res.send(successResponse({
        requestId: friend.id,
        message: "好友请求已发送"
      }))
    } catch (error) {
      if (error.message === '好友请求已存在' || error.message === '你们已经是好友或已有待处理请求') {
        return res.status(409).send(errorResponse(error.message, 'CONFLICT'))
      }
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/friends/accept - 接受好友请求 (需登录)
  fastify.post('/friends/accept', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { requestId } = req.body

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Validate input
      if (!requestId) {
        return res.status(400).send(errorResponse('缺少 requestId', 'MISSING_PARAMS'))
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
        return res.status(404).send(errorResponse('好友请求不存在或已处理', 'NOT_FOUND'))
      }

      // Get original requester's user info for notification
      const requesterUser = await prisma.user.findUnique({
        where: { id: friendRequest.userId },
        select: { openid: true, nickname: true }
      })

      if (!requesterUser) {
        return res.status(404).send(errorResponse('用户不存在', 'USER_NOT_FOUND'))
      }

      // Update status to ACCEPTED and create reciprocal record atomically
      await prisma.$transaction([
        prisma.friend.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED' }
        }),
        prisma.friend.create({
          data: {
            userId: tokenUser.id,
            friendId: friendRequest.userId,
            status: 'ACCEPTED'
          }
        })
      ])

      // Create FRIEND_ACCEPTED notification for the original requester (fire-and-forget)
      createNotification(prisma, {
        openid: requesterUser.openid,
        type: 'FRIEND_ACCEPTED',
        fromOpenid: tokenUser.openid,
        fromNickname: tokenUser.nickname,
        targetId: null,
        targetTitle: null,
        message: tokenUser.nickname + ' 已通过你的好友申请'
      }).catch(err => {
        console.error('Failed to create FRIEND_ACCEPTED notification', err)
      })

      return res.send(successResponse({ message: "已添加好友" }))
    } catch (error) {
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/friends/reject - 拒绝好友请求 (需登录)
  fastify.post('/friends/reject', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { requestId } = req.body

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Validate input
      if (!requestId) {
        return res.status(400).send(errorResponse('缺少 requestId', 'MISSING_PARAMS'))
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
        return res.status(404).send(errorResponse('好友请求不存在或已处理', 'NOT_FOUND'))
      }

      // Delete the Friend record
      await prisma.friend.delete({
        where: { id: requestId }
      })

      return res.send(successResponse({ message: "已拒绝请求" }))
    } catch (error) {
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // DELETE /api/friends/:friendOpenid - 删除好友 (需登录)
  fastify.delete('/friends/:friendOpenid', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { friendOpenid } = req.params

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Validate input
      if (!friendOpenid) {
        return res.status(400).send(errorResponse('缺少 friendOpenid', 'MISSING_PARAMS'))
      }

      // Find friend user by openid
      const friendUser = await prisma.user.findUnique({
        where: { openid: friendOpenid }
      })

      if (!friendUser) {
        return res.status(404).send(errorResponse('用户不存在', 'USER_NOT_FOUND'))
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

      return res.send(successResponse({ message: "已删除好友" }))
    } catch (error) {
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // GET /api/friends - 获取好友列表 (需登录)
  fastify.get('/friends', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
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
        },
        take: 100
      })

      // Return list with friendSince date
      return res.send(successResponse({
        friends: friends.map(f => ({
          id: f.id,
          openid: f.friend.openid,
          nickname: f.friend.nickname,
          avatar: f.friend.avatar,
          friendSince: f.createdAt
        }))
      }))
    } catch (error) {
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // GET /api/friends/requests - 获取待处理请求 (需登录)
  fastify.get('/friends/requests', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
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
        },
        take: 50
      })

      // Return list with createdAt
      return res.send(successResponse({
        requests: requests.map(r => ({
          id: r.id,
          openid: r.user.openid,
          nickname: r.user.nickname,
          avatar: r.user.avatar,
          createdAt: r.createdAt
        }))
      }))
    } catch (error) {
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // GET /api/friends/sent - 获取发出的好友请求 (需登录)
  fastify.get('/friends/sent', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Find all Friend records where userId = current user's id AND status = PENDING
      const sentRequests = await prisma.friend.findMany({
        where: {
          userId: tokenUser.id,
          status: 'PENDING'
        },
        include: {
          friend: {
            select: {
              openid: true,
              nickname: true,
              avatar: true
            }
          }
        },
        take: 50
      })

      // Return list with createdAt
      return res.send(successResponse({
        sentRequests: sentRequests.map(r => ({
          id: r.id,
          openid: r.friend.openid,
          nickname: r.friend.nickname,
          avatar: r.friend.avatar,
          createdAt: r.createdAt
        }))
      }))
    } catch (error) {
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // GET /api/friends/:openid/posts - 获取好友公开帖子 (需登录)
  fastify.get('/friends/:openid/posts', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { openid } = req.params
      const { page = 1, limit = 10 } = req.query

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Validate input
      if (!openid) {
        return res.status(400).send(errorResponse('缺少 openid', 'MISSING_PARAMS'))
      }

      // Check: requesting user is friends with :openid (has ACCEPTED record)
      const friendUser = await prisma.user.findUnique({
        where: { openid }
      })

      if (!friendUser) {
        return res.status(404).send(errorResponse('用户不存在', 'USER_NOT_FOUND'))
      }

      const friendship = await prisma.friend.findFirst({
        where: {
          userId: tokenUser.id,
          friendId: friendUser.id,
          status: 'ACCEPTED'
        }
      })

      if (!friendship) {
        return res.status(403).send(errorResponse('你们不是好友关系', 'NOT_FRIENDS'))
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

      return res.send(successResponse({
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
      }))
    } catch (error) {
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // GET /api/friends/search - 搜索用户 (需登录)
  fastify.get('/friends/search', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { query, excludeId } = req.query

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).send(errorResponse('搜索词不能为空', 'MISSING_QUERY'))
      }

      const searchQuery = query.trim()

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Find users matching nickname (case-insensitive)
      const users = await prisma.user.findMany({
        where: {
          nickname: {
            contains: searchQuery,
            mode: 'insensitive'
          },
          // Exclude current user
          id: excludeId && typeof excludeId === 'string' ? { not: excludeId } : undefined
        },
        select: {
          openid: true,
          nickname: true,
          avatar: true,
          isMember: true
        },
        take: 20
      })

      // Return with openid as id for frontend compatibility
      return res.send(successResponse({
        users: users.map(u => ({
          id: u.openid,  // Use openid as id for navigation
          openid: u.openid,
          nickname: u.nickname,
          avatar: u.avatar,
          isMember: u.isMember
        }))
      }))
    } catch (error) {
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })
}
