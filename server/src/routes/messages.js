import { prisma } from '../config/database.js'
import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'
import { successResponse, errorResponse } from '../config/response.js'

// Helper to check if two users are friends
async function areFriends(userId1, userId2) {
  const friendship = await prisma.friend.findFirst({
    where: {
      userId: userId1,
      friendId: userId2,
      status: 'ACCEPTED'
    }
  })
  return !!friendship
}

export default async function messageRoutes(fastify) {
  // GET /api/messages/conversations - list conversations (latest message with each friend)
  fastify.get('/messages/conversations', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Get all ACCEPTED friendships for current user
      const friendships = await prisma.friend.findMany({
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
        take: 50
      })

      const conversations = await Promise.all(
        friendships.map(async (f) => {
          // Get latest message with this friend
          const latestMessage = await prisma.privateMessage.findFirst({
            where: {
              OR: [
                { fromOpenid: tokenUser.openid, toOpenid: f.friend.openid },
                { fromOpenid: f.friend.openid, toOpenid: tokenUser.openid }
              ]
            },
            orderBy: { createdAt: 'desc' }
          })

          // Count unread messages from this friend
          const unreadCount = await prisma.privateMessage.count({
            where: {
              fromOpenid: f.friend.openid,
              toOpenid: tokenUser.openid,
              isRead: false
            }
          })

          return {
            friendOpenid: f.friend.openid,
            friendNickname: f.friend.nickname,
            friendAvatar: f.friend.avatar,
            lastMessage: latestMessage ? {
              id: latestMessage.id,
              content: latestMessage.content,
              fromOpenid: latestMessage.fromOpenid,
              createdAt: latestMessage.createdAt,
              isRead: latestMessage.isRead
            } : null,
            unreadCount
          }
        })
      )

      // Sort by last message time, most recent first
      conversations.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0
        if (!a.lastMessage) return 1
        if (!b.lastMessage) return -1
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
      })

      return res.send(successResponse({ conversations }))
    } catch (error) {
      console.error('Get conversations error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // GET /api/messages/:friendOpenid - get message history with a specific friend
  fastify.get('/messages/:friendOpenid', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { friendOpenid } = req.params
      const { page = 1, limit = 50 } = req.query

      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Validate: must be friends
      const friendUser = await prisma.user.findUnique({
        where: { openid: friendOpenid }
      })

      if (!friendUser) {
        return res.status(404).send(errorResponse('用户不存在', 'USER_NOT_FOUND'))
      }

      const isFriendship = await areFriends(tokenUser.id, friendUser.id)
      if (!isFriendship) {
        return res.status(403).send(errorResponse('你们不是好友关系', 'NOT_FRIENDS'))
      }

      const skip = (parseInt(page) - 1) * parseInt(limit)

      // Get messages between the two users, ordered by createdAt desc (newest first for loading)
      const messages = await prisma.privateMessage.findMany({
        where: {
          OR: [
            { fromOpenid: tokenUser.openid, toOpenid: friendOpenid },
            { fromOpenid: friendOpenid, toOpenid: tokenUser.openid }
          ]
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      })

      // Reverse to show oldest first in UI
      messages.reverse()

      const total = await prisma.privateMessage.count({
        where: {
          OR: [
            { fromOpenid: tokenUser.openid, toOpenid: friendOpenid },
            { fromOpenid: friendOpenid, toOpenid: tokenUser.openid }
          ]
        }
      })

      return res.send(successResponse({
        messages: messages.map(m => ({
          id: m.id,
          fromOpenid: m.fromOpenid,
          toOpenid: m.toOpenid,
          content: m.content,
          isRead: m.isRead,
          createdAt: m.createdAt,
          isMine: m.fromOpenid === tokenUser.openid
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }))
    } catch (error) {
      console.error('Get messages error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/messages - send message
  fastify.post('/messages', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { toOpenid, content } = req.body

      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Validate input
      if (!toOpenid || !content) {
        return res.status(400).send(errorResponse('缺少收件人或内容', 'MISSING_PARAMS'))
      }

      if (content.trim().length === 0) {
        return res.status(400).send(errorResponse('消息内容不能为空', 'INVALID_CONTENT'))
      }

      // Cannot message self
      if (toOpenid === tokenUser.openid) {
        return res.status(400).send(errorResponse('不能给自己发消息', 'INVALID_RECIPIENT'))
      }

      // Validate: must be friends
      const friendUser = await prisma.user.findUnique({
        where: { openid: toOpenid }
      })

      if (!friendUser) {
        return res.status(404).send(errorResponse('用户不存在', 'USER_NOT_FOUND'))
      }

      const isFriendship = await areFriends(tokenUser.id, friendUser.id)
      if (!isFriendship) {
        return res.status(403).send(errorResponse('你们不是好友关系', 'NOT_FRIENDS'))
      }

      // Create message
      const message = await prisma.privateMessage.create({
        data: {
          fromOpenid: tokenUser.openid,
          toOpenid,
          content: content.trim()
        }
      })

      return res.send(successResponse({
        message: {
          id: message.id,
          fromOpenid: message.fromOpenid,
          toOpenid: message.toOpenid,
          content: message.content,
          isRead: message.isRead,
          createdAt: message.createdAt,
          isMine: true
        }
      }))
    } catch (error) {
      console.error('Send message error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/messages/:messageId/read - mark message as read
  fastify.post('/messages/:messageId/read', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { messageId } = req.params

      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Find the message
      const message = await prisma.privateMessage.findUnique({
        where: { id: messageId }
      })

      if (!message) {
        return res.status(404).send(errorResponse('消息不存在', 'NOT_FOUND'))
      }

      // Only the recipient can mark as read
      if (message.toOpenid !== tokenUser.openid) {
        return res.status(403).send(errorResponse('无法标记该消息为已读', 'FORBIDDEN'))
      }

      // Mark as read
      await prisma.privateMessage.update({
        where: { id: messageId },
        data: { isRead: true }
      })

      return res.send(successResponse({ success: true }))
    } catch (error) {
      console.error('Mark read error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })
}
