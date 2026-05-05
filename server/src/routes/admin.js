import { prisma } from '../config/database.js'
import { adminMiddleware } from '../middleware/adminAuth.js'
import { successResponse, errorResponse } from '../config/response.js'
import { createNotification } from '../services/notificationService.js'

// 辅助函数：获取每日统计数据
async function getDailyStats(prisma, startDate, endDate) {
  const dailyData = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    const [postsCreated, approved, rejected] = await Promise.all([
      prisma.dreamWall.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd }
        }
      }),
      prisma.dreamWall.count({
        where: {
          status: 'approved',
          updatedAt: { gte: dayStart, lte: dayEnd }
        }
      }),
      prisma.dreamWall.count({
        where: {
          status: 'rejected',
          updatedAt: { gte: dayStart, lte: dayEnd }
        }
      })
    ])

    dailyData.push({
      date: dayStart.toISOString().split('T')[0],
      dateLabel: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
      posts: postsCreated,
      approved,
      rejected
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dailyData
}

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
      const adminOpenid = req.userId

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

      // 记录操作日志
      await prisma.adminOperationLog.create({
        data: {
          adminOpenid,
          action: 'APPROVE_POST',
          targetType: 'post',
          targetId: postId
        }
      })

      return res.send(successResponse({ approved: true }))
    } catch (error) {
      console.error('Admin approve post error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/admin/posts/batch-approve - 批量通过审核
  fastify.post('/admin/posts/batch-approve', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { postIds } = req.body
      const adminOpenid = req.userId

      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).send(errorResponse('请选择要通过的帖子', 'INVALID_INPUT'))
      }

      // 只通过处于 pending 状态的帖子
      const pendingPosts = await prisma.dreamWall.findMany({
        where: {
          id: { in: postIds },
          status: 'pending'
        },
        select: { id: true }
      })

      if (pendingPosts.length === 0) {
        return res.status(400).send(errorResponse('没有待审核的帖子可以操作', 'NO_PENDING'))
      }

      await prisma.dreamWall.updateMany({
        where: { id: { in: pendingPosts.map(p => p.id) } },
        data: { status: 'approved' }
      })

      // 记录操作日志
      await prisma.adminOperationLog.create({
        data: {
          adminOpenid,
          action: 'BATCH_APPROVE',
          targetType: 'post',
          targetIds: pendingPosts.map(p => p.id)
        }
      })

      return res.send(successResponse({
        approved: true,
        count: pendingPosts.length
      }))
    } catch (error) {
      console.error('Admin batch approve error:', error)
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
      const adminOpenid = req.userId

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

      // 记录操作日志
      await prisma.adminOperationLog.create({
        data: {
          adminOpenid,
          action: 'REJECT_POST',
          targetType: 'post',
          targetId: postId,
          reason
        }
      })

      return res.send(successResponse({ rejected: true }))
    } catch (error) {
      console.error('Admin reject post error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/admin/posts/batch-reject - 批量拒绝审核
  fastify.post('/admin/posts/batch-reject', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { postIds, reason } = req.body
      const adminOpenid = req.userId

      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).send(errorResponse('请选择要拒绝的帖子', 'INVALID_INPUT'))
      }

      if (!reason) {
        return res.status(400).send(errorResponse('请选择拒绝原因', 'MISSING_REASON'))
      }

      // 只拒绝处于 pending 状态的帖子
      const pendingPosts = await prisma.dreamWall.findMany({
        where: {
          id: { in: postIds },
          status: 'pending'
        },
        select: { id: true, openid: true, storyTitle: true }
      })

      if (pendingPosts.length === 0) {
        return res.status(400).send(errorResponse('没有待审核的帖子可以操作', 'NO_PENDING'))
      }

      await prisma.dreamWall.updateMany({
        where: { id: { in: pendingPosts.map(p => p.id) } },
        data: { status: 'rejected' }
      })

      // 发送通知给所有被拒绝帖子的作者
      await Promise.all(pendingPosts.map(post =>
        createNotification(prisma, {
          openid: post.openid,
          type: 'POST_REJECTED',
          fromOpenid: 'system',
          fromNickname: '系统',
          targetId: post.id,
          targetTitle: post.storyTitle,
          message: `您的帖子「${post.storyTitle}」因【${reason}】已被撤回`
        })
      ))

      // 记录操作日志
      await prisma.adminOperationLog.create({
        data: {
          adminOpenid,
          action: 'BATCH_REJECT',
          targetType: 'post',
          targetIds: pendingPosts.map(p => p.id),
          reason
        }
      })

      return res.send(successResponse({
        rejected: true,
        count: pendingPosts.length
      }))
    } catch (error) {
      console.error('Admin batch reject error:', error)
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
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const [
        pendingCount,
        totalPosts,
        totalComments,
        postsLast7Days,
        postsLast7To14Days,
        approvedLast7Days,
        rejectedLast7Days
      ] = await Promise.all([
        prisma.dreamWall.count({ where: { status: 'pending' } }),
        prisma.dreamWall.count(),
        prisma.dreamWallComment.count(),
        // 最近7天发布的帖子数
        prisma.dreamWall.count({
          where: { createdAt: { gte: sevenDaysAgo } }
        }),
        // 上一个7天周期的帖子数（用于计算趋势）
        prisma.dreamWall.count({
          where: {
            createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }
          }
        }),
        // 最近7天审核通过的帖子数
        prisma.dreamWall.count({
          where: {
            status: 'approved',
            updatedAt: { gte: sevenDaysAgo }
          }
        }),
        // 最近7天审核拒绝的帖子数
        prisma.dreamWall.count({
          where: {
            status: 'rejected',
            updatedAt: { gte: sevenDaysAgo }
          }
        })
      ])

      // 计算帖子增长率
      const postsGrowth = postsLast7To14Days > 0
        ? Math.round(((postsLast7Days - postsLast7To14Days) / postsLast7To14Days) * 100)
        : postsLast7Days > 0 ? 100 : 0

      return res.send(successResponse({
        pendingPosts: pendingCount,
        totalPosts,
        totalComments,
        trends: {
          postsLast7Days,
          postsGrowth,
          approvedLast7Days,
          rejectedLast7Days
        },
        // 每日数据用于图表
        dailyStats: await getDailyStats(prisma, sevenDaysAgo, now)
      }))
    } catch (error) {
      console.error('Admin get stats error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })
}
