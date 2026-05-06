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
      const admin = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { openid: true }
      })
      if (!admin) {
        return res.status(401).send(errorResponse('管理员不存在', 'UNAUTHORIZED'))
      }
      const adminOpenid = admin.openid

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
      const admin = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { openid: true }
      })
      if (!admin) {
        return res.status(401).send(errorResponse('管理员不存在', 'UNAUTHORIZED'))
      }
      const adminOpenid = admin.openid

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
      const admin = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { openid: true }
      })
      if (!admin) {
        return res.status(401).send(errorResponse('管理员不存在', 'UNAUTHORIZED'))
      }
      const adminOpenid = admin.openid

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
        fromOpenid: adminOpenid,
        fromNickname: '管理员',
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
      const admin = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { openid: true }
      })
      if (!admin) {
        return res.status(401).send(errorResponse('管理员不存在', 'UNAUTHORIZED'))
      }
      const adminOpenid = admin.openid

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
          fromOpenid: adminOpenid,
          fromNickname: '管理员',
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

  // POST /api/admin/posts/:postId/feature - 设为精选
  fastify.post('/admin/posts/:postId/feature', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { postId } = req.params
      const admin = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { openid: true }
      })
      if (!admin) {
        return res.status(401).send(errorResponse('管理员不存在', 'UNAUTHORIZED'))
      }
      const adminOpenid = admin.openid

      const post = await prisma.dreamWall.findUnique({ where: { id: postId } })
      if (!post) {
        return res.status(404).send(errorResponse('帖子不存在', 'NOT_FOUND'))
      }

      if (post.isFeatured) {
        return res.status(400).send(errorResponse('该帖子已经是精选', 'ALREADY_FEATURED'))
      }

      const REWARD_POINTS = 20

      // 标记为精选并设置精选时间
      await prisma.dreamWall.update({
        where: { id: postId },
        data: {
          isFeatured: true,
          featuredAt: new Date()
        }
      })

      // 创建精选记录
      await prisma.dailyHighlight.create({
        data: {
          wallId: postId,
          rewardPoints: REWARD_POINTS,
          operatorOpenid: adminOpenid
        }
      })

      // 奖励作者积分
      await prisma.user.update({
        where: { openid: post.openid },
        data: { points: { increment: REWARD_POINTS } }
      })

      // 发送通知
      await createNotification(prisma, {
        openid: post.openid,
        type: 'POST_FEATURED',
        fromOpenid: adminOpenid,
        fromNickname: '管理员',
        targetId: post.sessionId,
        targetTitle: post.storyTitle,
        message: `恭喜！您的帖子「${post.storyTitle}」被选为每日精选，奖励 ${REWARD_POINTS} 积分！`
      })

      // 记录操作日志
      await prisma.adminOperationLog.create({
        data: {
          adminOpenid,
          action: 'FEATURE_POST',
          targetType: 'post',
          targetId: postId
        }
      })

      return res.send(successResponse({
        featured: true,
        rewardPoints: REWARD_POINTS
      }))
    } catch (error) {
      console.error('Admin feature post error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // DELETE /api/admin/posts/:postId/feature - 取消精选
  fastify.delete('/admin/posts/:postId/feature', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { postId } = req.params
      const admin = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { openid: true }
      })
      if (!admin) {
        return res.status(401).send(errorResponse('管理员不存在', 'UNAUTHORIZED'))
      }
      const adminOpenid = admin.openid

      const post = await prisma.dreamWall.findUnique({ where: { id: postId } })
      if (!post) {
        return res.status(404).send(errorResponse('帖子不存在', 'NOT_FOUND'))
      }

      if (!post.isFeatured) {
        return res.status(400).send(errorResponse('该帖子不是精选', 'NOT_FEATURED'))
      }

      // 取消精选
      await prisma.dreamWall.update({
        where: { id: postId },
        data: {
          isFeatured: false,
          featuredAt: null
        }
      })

      // 删除精选记录
      await prisma.dailyHighlight.delete({
        where: { wallId: postId }
      })

      // 记录操作日志
      await prisma.adminOperationLog.create({
        data: {
          adminOpenid,
          action: 'UNFEATURE_POST',
          targetType: 'post',
          targetId: postId
        }
      })

      return res.send(successResponse({ unfeatured: true }))
    } catch (error) {
      console.error('Admin unfeature post error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // ========================================
  // 精选候选管理（算法初筛 + 人工确认）
  // ========================================

  // POST /api/admin/highlights/generate - 运行算法生成候选
  fastify.post('/admin/highlights/generate', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const adminOpenid = req.userId
      const { days = 7, limit = 10 } = req.body

      // 计算时间范围（默认最近7天）
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(days))

      // 1. 找出最近N天发布的、已审核通过的、尚未成为精选的帖子
      const eligiblePosts = await prisma.dreamWall.findMany({
        where: {
          status: 'approved',
          isFeatured: false,
          createdAt: { gte: startDate }
        },
        select: {
          id: true,
          storyTitle: true,
          likeCount: true,
          commentCount: true,
          createdAt: true
        }
      })

      // 2. 计算热度分数并排序
      // 热度 = likes + comments * 2 + favorites * 3
      // 考虑时间衰减：新帖子权重更高
      const scoredPosts = eligiblePosts.map(post => {
        const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)
        const timeDecay = Math.max(0.5, 1 - (ageHours / (24 * 30))) // 30天后权重降至50%
        const engagementScore = (post.likeCount * 1) + (post.commentCount * 2)

        return {
          ...post,
          engagementScore: Math.round(engagementScore * timeDecay),
          ageHours: Math.round(ageHours)
        }
      })

      // 3. 按热度排序，取 Top N
      scoredPosts.sort((a, b) => b.engagementScore - a.engagementScore)
      const topPosts = scoredPosts.slice(0, parseInt(limit))

      if (topPosts.length === 0) {
        return res.send(successResponse({
          generated: 0,
          message: '没有符合条件的帖子生成候选'
        }))
      }

      // 4. 清除之前的待确认候选（避免重复）
      await prisma.highlightCandidate.deleteMany({
        where: { status: 'pending' }
      })

      // 5. 创建新候选
      const candidates = await Promise.all(
        topPosts.map((post, index) =>
          prisma.highlightCandidate.create({
            data: {
              wallId: post.id,
              engagementScore: post.engagementScore,
              rank: index + 1,
              status: 'pending'
            }
          })
        )
      )

      // 6. 记录操作日志
      await prisma.adminOperationLog.create({
        data: {
          adminOpenid,
          action: 'GENERATE_HIGHLIGHT_CANDIDATES',
          targetType: 'highlight',
          targetIds: candidates.map(c => c.id)
        }
      })

      return res.send(successResponse({
        generated: candidates.length,
        candidates: topPosts.map((p, i) => ({
          wallId: p.id,
          storyTitle: p.storyTitle,
          engagementScore: p.engagementScore,
          rank: i + 1
        }))
      }))
    } catch (error) {
      console.error('Admin generate highlights error:', error)
      console.error('Error details:', error.message, error.stack)
      return res.status(500).send(errorResponse(`服务器错误: ${error.message}`, 'SERVER_ERROR'))
    }
  })

  // GET /api/admin/highlights/candidates - 获取候选列表
  fastify.get('/admin/highlights/candidates', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { status = 'pending' } = req.query

      const candidates = await prisma.highlightCandidate.findMany({
        where: { status },
        orderBy: { rank: 'asc' },
        include: {
          wall: {
            select: {
              storyTitle: true,
              storySnippet: true,
              likeCount: true,
              commentCount: true,
              nickname: true,
              avatar: true,
              createdAt: true
            }
          }
        }
      })

      return res.send(successResponse({
        candidates: candidates.map(c => ({
          id: c.id,
          wallId: c.wallId,
          storyTitle: c.wall?.storyTitle,
          storySnippet: c.wall?.storySnippet,
          likeCount: c.wall?.likeCount || 0,
          commentCount: c.wall?.commentCount || 0,
          nickname: c.wall?.nickname,
          avatar: c.wall?.avatar,
          createdAt: c.wall?.createdAt,
          engagementScore: c.engagementScore,
          rank: c.rank,
          status: c.status,
          generatedAt: c.generatedAt
        })),
        pagination: {
          page: 1,
          limit: 20,
          total: candidates.length,
          hasMore: false
        }
      }))
    } catch (error) {
      console.error('Admin get candidates error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/admin/highlights/:candidateId/approve - 确认候选为精选
  fastify.post('/admin/highlights/:candidateId/approve', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { candidateId } = req.params
      // req.userId is the user's id (cuid), need to look up openid for notifications
      const admin = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { openid: true }
      })
      if (!admin) {
        return res.status(401).send(errorResponse('管理员不存在', 'UNAUTHORIZED'))
      }
      const adminOpenid = admin.openid

      const candidate = await prisma.highlightCandidate.findUnique({
        where: { id: candidateId },
        include: { wall: true }
      })

      if (!candidate) {
        return res.status(404).send(errorResponse('候选不存在', 'NOT_FOUND'))
      }

      if (candidate.status !== 'pending') {
        return res.status(400).send(errorResponse('该候选已被处理', 'ALREADY_PROCESSED'))
      }

      if (candidate.wall?.isFeatured) {
        return res.status(400).send(errorResponse('该帖子已是精选', 'ALREADY_FEATURED'))
      }

      const REWARD_POINTS = 20

      // 使用事务确保所有操作原子性
      await prisma.$transaction(async (tx) => {
        // 更新帖子为精选
        await tx.dreamWall.update({
          where: { id: candidate.wallId },
          data: {
            isFeatured: true,
            featuredAt: new Date()
          }
        })

        // 创建精选记录
        await tx.dailyHighlight.create({
          data: {
            wallId: candidate.wallId,
            rewardPoints: REWARD_POINTS,
            operatorOpenid: adminOpenid
          }
        })

        // 更新候选状态
        await tx.highlightCandidate.update({
          where: { id: candidateId },
          data: {
            status: 'approved',
            reviewedAt: new Date(),
            reviewerOpenid: adminOpenid
          }
        })

        // 奖励作者积分
        if (candidate.wall) {
          await tx.user.update({
            where: { openid: candidate.wall.openid },
            data: { points: { increment: REWARD_POINTS } }
          })

          // 发送通知
          await createNotification(tx, {
            openid: candidate.wall.openid,
            type: 'POST_FEATURED',
            fromOpenid: adminOpenid,
            fromNickname: '管理员',
            targetId: candidate.wall.sessionId,
            targetTitle: candidate.wall.storyTitle,
            message: `恭喜！您的帖子「${candidate.wall.storyTitle}」被选为每日精选，奖励 ${REWARD_POINTS} 积分！`
          })
        }
      })

      // 记录操作日志（在事务外，避免通知失败时重复记录）
      await prisma.adminOperationLog.create({
        data: {
          adminOpenid,
          action: 'APPROVE_HIGHLIGHT_CANDIDATE',
          targetType: 'highlight',
          targetId: candidateId
        }
      })

      return res.send(successResponse({
        approved: true,
        rewardPoints: REWARD_POINTS
      }))
    } catch (error) {
      console.error('Admin approve candidate error:', error)
      console.error('Error stack:', error.stack)
      return res.status(500).send(errorResponse(`服务器错误: ${error.message}`, 'SERVER_ERROR'))
    }
  })

  // DELETE /api/admin/highlights/:candidateId - 拒绝候选
  fastify.delete('/admin/highlights/:candidateId', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { candidateId } = req.params
      const adminOpenid = req.userId

      const candidate = await prisma.highlightCandidate.findUnique({
        where: { id: candidateId }
      })

      if (!candidate) {
        return res.status(404).send(errorResponse('候选不存在', 'NOT_FOUND'))
      }

      if (candidate.status !== 'pending') {
        return res.status(400).send(errorResponse('该候选已被处理', 'ALREADY_PROCESSED'))
      }

      // 更新候选状态
      await prisma.highlightCandidate.update({
        where: { id: candidateId },
        data: {
          status: 'rejected',
          reviewedAt: new Date(),
          reviewerOpenid: adminOpenid
        }
      })

      // 记录操作日志
      await prisma.adminOperationLog.create({
        data: {
          adminOpenid,
          action: 'REJECT_HIGHLIGHT_CANDIDATE',
          targetType: 'highlight',
          targetId: candidateId
        }
      })

      return res.send(successResponse({ rejected: true }))
    } catch (error) {
      console.error('Admin reject candidate error:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/admin/highlights/batch-approve - 批量确认候选
  fastify.post('/admin/highlights/batch-approve', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { candidateIds } = req.body
      // req.userId is the user's id (cuid), need to look up openid for notifications
      const admin = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { openid: true }
      })
      if (!admin) {
        return res.status(401).send(errorResponse('管理员不存在', 'UNAUTHORIZED'))
      }
      const adminOpenid = admin.openid

      if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
        return res.status(400).send(errorResponse('请选择要确认的候选', 'INVALID_INPUT'))
      }

      const candidates = await prisma.highlightCandidate.findMany({
        where: {
          id: { in: candidateIds },
          status: 'pending'
        },
        include: { wall: true }
      })

      if (candidates.length === 0) {
        return res.status(400).send(errorResponse('没有待确认的候选', 'NO_PENDING'))
      }

      const REWARD_POINTS = 20
      const approvedIds = []

      // 使用事务确保所有操作原子性
      await prisma.$transaction(async (tx) => {
        for (const candidate of candidates) {
          if (!candidate.wall || candidate.wall.isFeatured) continue

          // 更新帖子为精选
          await tx.dreamWall.update({
            where: { id: candidate.wallId },
            data: {
              isFeatured: true,
              featuredAt: new Date()
            }
          })

          // 创建精选记录
          await tx.dailyHighlight.create({
            data: {
              wallId: candidate.wallId,
              rewardPoints: REWARD_POINTS,
              operatorOpenid: adminOpenid
            }
          })

          // 更新候选状态
          await tx.highlightCandidate.update({
            where: { id: candidate.id },
            data: {
              status: 'approved',
              reviewedAt: new Date(),
              reviewerOpenid: adminOpenid
            }
          })

          // 奖励作者积分并发送通知
          await tx.user.update({
            where: { openid: candidate.wall.openid },
            data: { points: { increment: REWARD_POINTS } }
          })

          await createNotification(tx, {
            openid: candidate.wall.openid,
            type: 'POST_FEATURED',
            fromOpenid: adminOpenid,
            fromNickname: '管理员',
            targetId: candidate.wall.sessionId,
            targetTitle: candidate.wall.storyTitle,
            message: `恭喜！您的帖子「${candidate.wall.storyTitle}」被选为每日精选，奖励 ${REWARD_POINTS} 积分！`
          })

          approvedIds.push(candidate.id)
        }
      })

      // 记录操作日志（在事务外）
      await prisma.adminOperationLog.create({
        data: {
          adminOpenid,
          action: 'BATCH_APPROVE_HIGHLIGHT_CANDIDATES',
          targetType: 'highlight',
          targetIds: approvedIds
        }
      })

      return res.send(successResponse({
        approved: true,
        count: approvedIds.length
      }))
    } catch (error) {
      console.error('Admin batch approve candidates error:', error)
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

  // ========================================
  // 故事资产管理
  // ========================================

  // PUT /api/admin/assets/:sessionId/upgrade - 手动提升故事质量等级
  fastify.put('/admin/assets/:sessionId/upgrade', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { sessionId } = req.params
      const { qualityLevel } = req.body

      if (!['normal', 'premium', 'curated'].includes(qualityLevel)) {
        return res.status(400).send(errorResponse('无效的质量等级', 'INVALID_QUALITY'))
      }

      // 检查故事是否存在
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { story: true }
      })

      if (!session || !session.story) {
        return res.status(404).send(errorResponse('故事不存在', 'NOT_FOUND'))
      }

      // 查找或创建 StoryAsset
      let asset = await prisma.storyAsset.findUnique({
        where: { sessionId }
      })

      if (!asset) {
        asset = await prisma.storyAsset.create({
          data: {
            sessionId,
            openid: session.openid,
            qualityLevel
          }
        })
      } else {
        asset = await prisma.storyAsset.update({
          where: { sessionId },
          data: { qualityLevel }
        })
      }

      return res.send(successResponse({ asset }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // ========================================
  // 合集管理
  // ========================================

  // GET /api/admin/collections - 获取所有合集（包含待发布）
  fastify.get('/admin/collections', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { page = 1, limit = 20, status } = req.query
      const skip = (parseInt(page) - 1) * parseInt(limit)

      const where = status ? { status } : {}

      const [collections, total] = await Promise.all([
        prisma.collection.findMany({
          where,
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: parseInt(limit),
          include: {
            _count: { select: { episodes: true } }
          }
        }),
        prisma.collection.count({ where })
      ])

      return res.send(successResponse({
        collections: collections.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          cover: c.cover,
          theme: c.theme,
          status: c.status,
          order: c.order,
          storyCount: c._count.episodes,
          createdAt: c.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          hasMore: skip + collections.length < total
        }
      }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/admin/collections - 创建合集
  fastify.post('/admin/collections', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { title, description, cover, theme, order = 0 } = req.body

      if (!title) {
        return res.status(400).send(errorResponse('请填写合集标题', 'MISSING_TITLE'))
      }

      const collection = await prisma.collection.create({
        data: {
          title,
          description,
          cover,
          theme,
          order,
          status: 'draft'
        }
      })

      return res.send(successResponse({ collection }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // PUT /api/admin/collections/:id - 更新合集
  fastify.put('/admin/collections/:id', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { id } = req.params
      const { title, description, cover, theme, status, order } = req.body

      const collection = await prisma.collection.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(cover !== undefined && { cover }),
          ...(theme !== undefined && { theme }),
          ...(status !== undefined && { status }),
          ...(order !== undefined && { order })
        }
      })

      return res.send(successResponse({ collection }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // DELETE /api/admin/collections/:id - 删除合集
  fastify.delete('/admin/collections/:id', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { id } = req.params

      await prisma.collection.delete({ where: { id } })

      return res.send(successResponse({ deleted: true }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/admin/collections/:id/episodes - 添加章节到合集
  fastify.post('/admin/collections/:id/episodes', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { id } = req.params
      const { sessionId, title, excerpt, order } = req.body

      if (!sessionId) {
        return res.status(400).send(errorResponse('缺少 sessionId', 'MISSING_SESSION'))
      }

      // 检查合集是否存在
      const collection = await prisma.collection.findUnique({ where: { id } })
      if (!collection) {
        return res.status(404).send(errorResponse('合集不存在', 'NOT_FOUND'))
      }

      // 检查 session 是否已存在于其他合集
      const existing = await prisma.episode.findUnique({ where: { sessionId } })
      if (existing) {
        return res.status(400).send(errorResponse('该故事已在其他合集中', 'ALREADY_EXISTS'))
      }

      // 获取 session 信息
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { story: true }
      })
      if (!session || !session.story) {
        return res.status(404).send(errorResponse('故事不存在', 'NOT_FOUND'))
      }

      // 创建或升级 StoryAsset
      let asset = await prisma.storyAsset.findUnique({ where: { sessionId } })
      if (!asset) {
        asset = await prisma.storyAsset.create({
          data: {
            sessionId,
            openid: session.openid,
            qualityLevel: 'premium' // 加入合集自动标记为 premium
          }
        })
      } else if (asset.qualityLevel === 'normal') {
        asset = await prisma.storyAsset.update({
          where: { sessionId },
          data: { qualityLevel: 'premium' }
        })
      }

      // 获取当前最大 order
      const maxOrder = await prisma.episode.aggregate({
        where: { collectionId: id },
        _max: { order: true }
      })

      const episode = await prisma.episode.create({
        data: {
          collectionId: id,
          sessionId,
          title: title || session.story.title,
          excerpt: excerpt || session.dreamFragment?.slice(0, 150),
          order: order ?? (maxOrder._max.order ?? -1) + 1
        }
      })

      return res.send(successResponse({ episode }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // DELETE /api/admin/collections/:collectionId/episodes/:episodeId - 从合集移除章节
  fastify.delete('/admin/collections/:collectionId/episodes/:episodeId', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { episodeId } = req.params

      await prisma.episode.delete({ where: { id: episodeId } })

      return res.send(successResponse({ deleted: true }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // PUT /api/admin/collections/:id/episodes/reorder - 章节排序
  fastify.put('/admin/collections/:collectionId/episodes/reorder', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { collectionId } = req.params
      const { episodeIds } = req.body // [episodeId1, episodeId2, ...]

      if (!Array.isArray(episodeIds)) {
        return res.status(400).send(errorResponse('episodeIds 必须是数组', 'INVALID_ORDER'))
      }

      // 批量更新 order
      await prisma.$transaction(
        episodeIds.map((episodeId, index) =>
          prisma.episode.update({
            where: { id: episodeId },
            data: { order: index }
          })
        )
      )

      return res.send(successResponse({ success: true }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // ========================================
  // 故事质量自动升级（定时任务触发的接口）
  // ========================================

  // POST /api/admin/assets/auto-upgrade - 自动升级达标故事的质量等级
  fastify.post('/admin/assets/auto-upgrade', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      // 查找 normal 级别的已发布梦墙帖子，点赞>=20 且评论>=5
      const qualifiedPosts = await prisma.dreamWall.findMany({
        where: {
          status: 'approved',
          likeCount: { gte: 20 },
          commentCount: { gte: 5 }
        },
        include: {
          session: {
            include: { story: true }
          }
        }
      })

      let upgradedCount = 0
      for (const post of qualifiedPosts) {
        const existing = await prisma.storyAsset.findUnique({
          where: { sessionId: post.sessionId }
        })

        if (!existing) {
          // 新建 asset
          await prisma.storyAsset.create({
            data: {
              sessionId: post.sessionId,
              openid: post.openid,
              qualityLevel: 'premium'
            }
          })
          upgradedCount++
        } else if (existing.qualityLevel === 'normal') {
          // 升级现有 asset
          await prisma.storyAsset.update({
            where: { sessionId: post.sessionId },
            data: { qualityLevel: 'premium' }
          })
          upgradedCount++
        }
      }

      return res.send(successResponse({
        upgradedCount,
        totalScanned: qualifiedPosts.length
      }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // ========================================
  // 故事资产候选管理
  // ========================================

  // POST /api/admin/assets/generate-candidates - 自动生成候选列表
  fastify.post('/admin/assets/generate-candidates', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      // 筛选条件：
      // premium候选：点赞>=10 且 评论>=3
      // curated候选：点赞>=30 且 评论>=10
      const qualifiedPosts = await prisma.dreamWall.findMany({
        where: {
          status: 'approved'
        },
        include: {
          session: {
            include: { story: true }
          }
        }
      })

      let generatedCount = 0
      const engagementScore = (likeCount, commentCount) => likeCount * 1 + commentCount * 2

      for (const post of qualifiedPosts) {
        // 检查是否已有有效asset
        const existingAsset = await prisma.storyAsset.findUnique({
          where: { sessionId: post.sessionId }
        })
        if (existingAsset && existingAsset.qualityLevel !== 'normal') {
          continue // 已经是premium或curated，跳过
        }

        // 检查是否已有待处理候选
        const existingCandidate = await prisma.storyAssetCandidate.findUnique({
          where: { sessionId: post.sessionId }
        })
        if (existingCandidate && existingCandidate.status === 'pending') {
          continue // 已有待处理候选，跳过
        }

        // 确定目标等级
        let targetLevel = null
        if (post.likeCount >= 30 && post.commentCount >= 10) {
          targetLevel = 'curated'
        } else if (post.likeCount >= 10 && post.commentCount >= 3) {
          targetLevel = 'premium'
        }

        if (!targetLevel) continue

        // 创建或更新候选
        const score = engagementScore(post.likeCount, post.commentCount)
        if (existingCandidate) {
          await prisma.storyAssetCandidate.update({
            where: { sessionId: post.sessionId },
            data: {
              targetLevel,
              likeCount: post.likeCount,
              commentCount: post.commentCount,
              engagementScore: score,
              status: 'pending',
              reviewedAt: null,
              reviewerOpenid: null
            }
          })
        } else {
          await prisma.storyAssetCandidate.create({
            data: {
              sessionId: post.sessionId,
              openid: post.openid,
              targetLevel,
              likeCount: post.likeCount,
              commentCount: post.commentCount,
              engagementScore: score
            }
          })
        }
        generatedCount++
      }

      return res.send(successResponse({
        generatedCount,
        totalScanned: qualifiedPosts.length
      }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // GET /api/admin/assets/candidates - 获取候选列表
  fastify.get('/admin/assets/candidates', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { status = 'pending', page = 1, limit = 20 } = req.query
      const skip = (parseInt(page) - 1) * parseInt(limit)

      const where = {}
      if (status !== 'all') {
        where.status = status
      }

      const [candidates, total] = await Promise.all([
        prisma.storyAssetCandidate.findMany({
          where,
          orderBy: { engagementScore: 'desc' },
          skip,
          take: parseInt(limit),
          include: {
            session: {
              include: {
                story: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        }),
        prisma.storyAssetCandidate.count({ where })
      ])

      return res.send(successResponse({
        candidates: candidates.map(c => ({
          id: c.id,
          sessionId: c.sessionId,
          storyTitle: c.session?.story?.title || '未知',
          targetLevel: c.targetLevel,
          likeCount: c.likeCount,
          commentCount: c.commentCount,
          engagementScore: c.engagementScore,
          status: c.status,
          generatedAt: c.generatedAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          hasMore: skip + candidates.length < total
        }
      }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/admin/assets/candidates/:sessionId/approve - 确认候选
  fastify.post('/admin/assets/candidates/:sessionId/approve', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { sessionId } = req.params
      const admin = await prisma.user.findUnique({
        where: { id: req.userId }
      })
      if (!admin) {
        return res.status(404).send(errorResponse('管理员不存在', 'NOT_FOUND'))
      }

      const candidate = await prisma.storyAssetCandidate.findUnique({
        where: { sessionId }
      })
      if (!candidate) {
        return res.status(404).send(errorResponse('候选不存在', 'NOT_FOUND'))
      }

      // 使用事务创建/升级asset并更新候选状态
      await prisma.$transaction(async (tx) => {
        // 创建或升级asset
        const existingAsset = await tx.storyAsset.findUnique({
          where: { sessionId }
        })

        if (existingAsset) {
          await tx.storyAsset.update({
            where: { sessionId },
            data: { qualityLevel: candidate.targetLevel }
          })
        } else {
          await tx.storyAsset.create({
            data: {
              sessionId,
              openid: candidate.openid,
              qualityLevel: candidate.targetLevel
            }
          })
        }

        // 更新候选状态
        await tx.storyAssetCandidate.update({
          where: { sessionId },
          data: {
            status: 'approved',
            reviewedAt: new Date(),
            reviewerOpenid: admin.openid
          }
        })
      })

      return res.send(successResponse({ message: '已确认候选' }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // DELETE /api/admin/assets/candidates/:sessionId - 拒绝候选
  fastify.delete('/admin/assets/candidates/:sessionId', {
    preHandler: async (req, res) => {
      await adminMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { sessionId } = req.params
      const admin = await prisma.user.findUnique({
        where: { id: req.userId }
      })
      if (!admin) {
        return res.status(404).send(errorResponse('管理员不存在', 'NOT_FOUND'))
      }

      const candidate = await prisma.storyAssetCandidate.findUnique({
        where: { sessionId }
      })
      if (!candidate) {
        return res.status(404).send(errorResponse('候选不存在', 'NOT_FOUND'))
      }

      await prisma.storyAssetCandidate.update({
        where: { sessionId },
        data: {
          status: 'rejected',
          reviewedAt: new Date(),
          reviewerOpenid: admin.openid
        }
      })

      return res.send(successResponse({ message: '已拒绝候选' }))
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })
}
