import { prisma } from '../config/database.js'
import { adminMiddleware } from '../middleware/adminAuth.js'
import { successResponse, errorResponse } from '../config/response.js'
import { createNotification } from '../services/notificationService.js'

export default async function adminRoutes(fastify) {
  // ========================================
  // 帖子审核
  // ========================================

  // GET /api/admin/posts/pending - 获取待审核帖子
  fastify.get('/admin/posts/pending', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const skip = (pageNum - 1) * limitNum

      const [posts, total] = await Promise.all([
        prisma.dreamWall.findMany({
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          select: {
            id: true,
            sessionId: true,
            openid: true,
            nickname: true,
            avatar: true,
            storyTitle: true,
            storySnippet: true,
            isAnonymous: true,
            createdAt: true
          }
        }),
        prisma.dreamWall.count({ where: { status: 'pending' } })
      ])

      return res.send(successResponse({
        posts: posts.map(p => ({
          ...p,
          nickname: p.isAnonymous ? '匿名用户' : (p.nickname || '匿名用户')
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          hasMore: skip + posts.length < total
        }
      }))
    } catch (error) {
      console.error('Admin get pending posts error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/admin/posts/:postId/approve - 通过审核
  fastify.post('/admin/posts/:postId/approve', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { postId } = req.params

      const post = await prisma.dreamWall.findUnique({ where: { id: postId } })
      if (!post) {
        return res.status(404).send(errorResponse('帖子不存在', 'NOT_FOUND'))
      }

      if (post.status !== 'pending') {
        return res.status(400).send(errorResponse('帖子不在待审核状态', 'INVALID_STATUS'))
      }

      await prisma.dreamWall.update({
        where: { id: postId },
        data: { status: 'approved' }
      })

      return res.send(successResponse({ approved: true }))
    } catch (error) {
      console.error('Admin approve post error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/admin/posts/:postId/reject - 拒绝审核
  fastify.post('/admin/posts/:postId/reject', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { postId } = req.params
      const { reason } = req.body

      if (!reason) {
        return res.status(400).send(errorResponse('请选择拒绝原因', 'MISSING_REASON'))
      }

      const post = await prisma.dreamWall.findUnique({ where: { id: postId } })
      if (!post) {
        return res.status(404).send(errorResponse('帖子不存在', 'NOT_FOUND'))
      }

      if (post.status !== 'pending') {
        return res.status(400).send(errorResponse('帖子不在待审核状态', 'INVALID_STATUS'))
      }

      // Update post status
      await prisma.dreamWall.update({
        where: { id: postId },
        data: { status: 'rejected' }
      })

      // Send notification to post author
      await createNotification(prisma, {
        openid: post.openid,
        type: 'POST_REJECTED',
        fromOpenid: 'system',
        fromNickname: '系统',
        targetId: post.id,
        targetTitle: post.storyTitle,
        message: `您的帖子「${post.storyTitle}」因【${reason}】已被撤回`
      })

      return res.send(successResponse({ rejected: true }))
    } catch (error) {
      console.error('Admin reject post error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // ========================================
  // 评论管理
  // ========================================

  // GET /api/admin/comments - 获取所有评论
  fastify.get('/admin/comments', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { page = 1, limit = 50, wallId } = req.query
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const skip = (pageNum - 1) * limitNum

      const where = wallId ? { wallId } : {}

      const [comments, total] = await Promise.all([
        prisma.dreamWallComment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          include: {
            wall: {
              select: {
                storyTitle: true
              }
            }
          }
        }),
        prisma.dreamWallComment.count({ where })
      ])

      return res.send(successResponse({
        comments: comments.map(c => ({
          id: c.id,
          wallId: c.wallId,
          openid: c.openid,
          nickname: c.isAnonymous ? '匿名用户' : (c.nickname || '匿名用户'),
          content: c.content,
          createdAt: c.createdAt,
          wallTitle: c.wall?.storyTitle || '未知帖子'
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          hasMore: skip + comments.length < total
        }
      }))
    } catch (error) {
      console.error('Admin get comments error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // DELETE /api/admin/comments/:commentId - 删除评论
  fastify.delete('/admin/comments/:commentId', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { commentId } = req.params

      const comment = await prisma.dreamWallComment.findUnique({
        where: { id: commentId },
        include: { wall: true }
      })

      if (!comment) {
        return res.status(404).send(errorResponse('评论不存在', 'NOT_FOUND'))
      }

      // Delete comment
      await prisma.dreamWallComment.delete({
        where: { id: commentId }
      })

      // Decrement comment count on wall post
      if (comment.wall) {
        await prisma.dreamWall.update({
          where: { id: comment.wallId },
          data: { commentCount: { decrement: 1 } }
        })
      }

      return res.send(successResponse({ deleted: true }))
    } catch (error) {
      console.error('Admin delete comment error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // ========================================
  // 获取统计数据（方便 admin 概览）
  // ========================================

  // GET /api/admin/stats - 获取审核统计数据
  fastify.get('/admin/stats', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const [pendingCount, totalPosts, totalComments] = await Promise.all([
        prisma.dreamWall.count({ where: { status: 'pending' } }),
        prisma.dreamWall.count(),
        prisma.dreamWallComment.count()
      ])

      return res.send(successResponse({
        pendingPosts: pendingCount,
        totalPosts,
        totalComments
      }))
    } catch (error) {
      console.error('Admin get stats error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })
}
