import { prisma } from '../config/database.js'
import { createNotification } from '../services/notificationService.js'

// Daily Stats helper function
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
      dateLabel: dayStart.getMonth() + 1 + '/' + dayStart.getDate(),
      posts: postsCreated,
      approved,
      rejected
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dailyData
}


// Posts Moderation Methods
export const adminService = {
  // Helper: Get admin openid from userId
  async getAdminOpenid(userId) {
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { openid: true }
    })
    if (!admin) {
      throw { status: 401, code: 'UNAUTHORIZED', message: '管理员不存在' }
    }
    return admin.openid
  },

  // Helper: Log admin operation
  async logOperation(adminOpenid, action, targetType, targetId, targetIds, reason) {
    const data = { adminOpenid, action, targetType }
    if (targetId) data.targetId = targetId
    if (targetIds) data.targetIds = targetIds
    if (reason) data.reason = reason
    await prisma.adminOperationLog.create({ data })
  },

  // Get pending posts
  async getPendingPosts({ page = 1, limit = 20 }) {
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

    return {
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
    }
  },


  // Approve a single post
  async approvePost({ postId, userId }) {
    const adminOpenid = await this.getAdminOpenid(userId)

    const post = await prisma.dreamWall.findUnique({ where: { id: postId } })
    if (!post) {
      throw { status: 404, code: 'NOT_FOUND', message: '帖子不存在' }
    }
    if (post.status !== 'pending') {
      throw { status: 400, code: 'INVALID_STATUS', message: '帖子不在待审核状态' }
    }

    await prisma.dreamWall.update({
      where: { id: postId },
      data: { status: 'approved' }
    })

    await this.logOperation(adminOpenid, 'APPROVE_POST', 'post', postId)
    return { approved: true }
  },


  // Batch approve posts
  async batchApprove({ postIds, userId }) {
    const adminOpenid = await this.getAdminOpenid(userId)

    if (!Array.isArray(postIds) || postIds.length === 0) {
      throw { status: 400, code: 'INVALID_INPUT', message: '请选择要通过的帖子' }
    }

    const pendingPosts = await prisma.dreamWall.findMany({
      where: {
        id: { in: postIds },
        status: 'pending'
      },
      select: { id: true }
    })

    if (pendingPosts.length === 0) {
      throw { status: 400, code: 'NO_PENDING', message: '没有待审核的帖子可以操作' }
    }

    await prisma.dreamWall.updateMany({
      where: { id: { in: pendingPosts.map(p => p.id) } },
      data: { status: 'approved' }
    })

    await this.logOperation(adminOpenid, 'BATCH_APPROVE', 'post', null, pendingPosts.map(p => p.id))
    return { approved: true, count: pendingPosts.length }
  },


  // Reject a single post
  async rejectPost({ postId, reason, userId }) {
    const adminOpenid = await this.getAdminOpenid(userId)

    if (!reason) {
      throw { status: 400, code: 'MISSING_REASON', message: '请选择拒绝原因' }
    }

    const post = await prisma.dreamWall.findUnique({ where: { id: postId } })
    if (!post) {
      throw { status: 404, code: 'NOT_FOUND', message: '帖子不存在' }
    }
    if (post.status !== 'pending') {
      throw { status: 400, code: 'INVALID_STATUS', message: '帖子不在待审核状态' }
    }

    await prisma.dreamWall.update({
      where: { id: postId },
      data: { status: 'rejected' }
    })

    await createNotification(prisma, {
      openid: post.openid,
      type: 'POST_REJECTED',
      fromOpenid: adminOpenid,
      fromNickname: '管理员',
      targetId: post.id,
      targetTitle: post.storyTitle,
      message: '您的帖子「' + post.storyTitle + '」因【' + reason + '】已被撤回'
    })

    await this.logOperation(adminOpenid, 'REJECT_POST', 'post', postId, null, reason)
    return { rejected: true }
  },


  // Batch reject posts
  async batchReject({ postIds, reason, userId }) {
    const adminOpenid = await this.getAdminOpenid(userId)

    if (!Array.isArray(postIds) || postIds.length === 0) {
      throw { status: 400, code: 'INVALID_INPUT', message: '请选择要拒绝的帖子' }
    }
    if (!reason) {
      throw { status: 400, code: 'MISSING_REASON', message: '请选择拒绝原因' }
    }

    const pendingPosts = await prisma.dreamWall.findMany({
      where: {
        id: { in: postIds },
        status: 'pending'
      },
      select: { id: true, openid: true, storyTitle: true }
    })

    if (pendingPosts.length === 0) {
      throw { status: 400, code: 'NO_PENDING', message: '没有待审核的帖子可以操作' }
    }

    await prisma.dreamWall.updateMany({
      where: { id: { in: pendingPosts.map(p => p.id) } },
      data: { status: 'rejected' }
    })

    await Promise.all(pendingPosts.map(post =>
      createNotification(prisma, {
        openid: post.openid,
        type: 'POST_REJECTED',
        fromOpenid: adminOpenid,
        fromNickname: '管理员',
        targetId: post.id,
        targetTitle: post.storyTitle,
        message: '您的帖子「' + post.storyTitle + '」因【' + reason + '】已被撤回'
      })
    ))

    await this.logOperation(adminOpenid, 'BATCH_REJECT', 'post', null, pendingPosts.map(p => p.id), reason)
    return { rejected: true, count: pendingPosts.length }
  },


  // Feature a post (set as highlight)
  async featurePost({ postId, userId }) {
    const adminOpenid = await this.getAdminOpenid(userId)
    const REWARD_POINTS = 20

    const post = await prisma.dreamWall.findUnique({ where: { id: postId } })
    if (!post) {
      throw { status: 404, code: 'NOT_FOUND', message: '帖子不存在' }
    }
    if (post.isFeatured) {
      throw { status: 400, code: 'ALREADY_FEATURED', message: '该帖子已经是精选' }
    }

    await prisma.dreamWall.update({
      where: { id: postId },
      data: {
        isFeatured: true,
        featuredAt: new Date()
      }
    })

    await prisma.dailyHighlight.create({
      data: {
        wallId: postId,
        rewardPoints: REWARD_POINTS,
        operatorOpenid: adminOpenid
      }
    })

    await prisma.user.update({
      where: { openid: post.openid },
      data: { points: { increment: REWARD_POINTS } }
    })

    await createNotification(prisma, {
      openid: post.openid,
      type: 'POST_FEATURED',
      fromOpenid: adminOpenid,
      fromNickname: '管理员',
      targetId: post.sessionId,
      targetTitle: post.storyTitle,
      message: '恭喜！您的帖子「' + post.storyTitle + '」被选为每日精选，奖励 ' + REWARD_POINTS + ' 积分！'
    })

    await this.logOperation(adminOpenid, 'FEATURE_POST', 'post', postId)
    return { featured: true, rewardPoints: REWARD_POINTS }
  },


  // Unfeature a post
  async unfeaturePost({ postId, userId }) {
    const adminOpenid = await this.getAdminOpenid(userId)

    const post = await prisma.dreamWall.findUnique({ where: { id: postId } })
    if (!post) {
      throw { status: 404, code: 'NOT_FOUND', message: '帖子不存在' }
    }
    if (!post.isFeatured) {
      throw { status: 400, code: 'NOT_FEATURED', message: '该帖子不是精选' }
    }

    await prisma.dreamWall.update({
      where: { id: postId },
      data: {
        isFeatured: false,
        featuredAt: null
      }
    })

    await prisma.dailyHighlight.delete({
      where: { wallId: postId }
    })

    await this.logOperation(adminOpenid, 'UNFEATURE_POST', 'post', postId)
    return { unfeatured: true }
  },


  // Generate highlight candidates
  async generateCandidates({ days = 7, limit = 10, userId }) {
    const adminOpenid = userId // userId in this case is already openid for admin operations
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(days))

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

    const scoredPosts = eligiblePosts.map(post => {
      const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)
      const timeDecay = Math.max(0.5, 1 - (ageHours / (24 * 30)))
      const engagementScore = (post.likeCount * 1) + (post.commentCount * 2)
      return {
        ...post,
        engagementScore: Math.round(engagementScore * timeDecay),
        ageHours: Math.round(ageHours)
      }
    })

    scoredPosts.sort((a, b) => b.engagementScore - a.engagementScore)
    const topPosts = scoredPosts.slice(0, parseInt(limit))

    if (topPosts.length === 0) {
      return { generated: 0, message: '没有符合条件的帖子生成候选' }
    }

    await prisma.highlightCandidate.deleteMany({
      where: { status: 'pending' }
    })

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

    await this.logOperation(adminOpenid, 'GENERATE_HIGHLIGHT_CANDIDATES', 'highlight', null, candidates.map(c => c.id))
    return {
      generated: candidates.length,
      candidates: topPosts.map((p, i) => ({
        wallId: p.id,
        storyTitle: p.storyTitle,
        engagementScore: p.engagementScore,
        rank: i + 1
      }))
    }
  },


  // Get highlight candidates
  async getCandidates({ status = 'pending' }) {
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

    return {
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
    }
  },


  // Approve highlight candidate
  async approveCandidate({ candidateId, userId }) {
    const adminOpenid = await this.getAdminOpenid(userId)
    const REWARD_POINTS = 20

    const candidate = await prisma.highlightCandidate.findUnique({
      where: { id: candidateId },
      include: { wall: true }
    })

    if (!candidate) {
      throw { status: 404, code: 'NOT_FOUND', message: '候选不存在' }
    }
    if (candidate.status !== 'pending') {
      throw { status: 400, code: 'ALREADY_PROCESSED', message: '该候选已被处理' }
    }
    if (candidate.wall?.isFeatured) {
      throw { status: 400, code: 'ALREADY_FEATURED', message: '该帖子已是精选' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.dreamWall.update({
        where: { id: candidate.wallId },
        data: { isFeatured: true, featuredAt: new Date() }
      })

      await tx.dailyHighlight.create({
        data: {
          wallId: candidate.wallId,
          rewardPoints: REWARD_POINTS,
          operatorOpenid: adminOpenid
        }
      })

      await tx.highlightCandidate.update({
        where: { id: candidateId },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewerOpenid: adminOpenid
        }
      })

      if (candidate.wall) {
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
          message: '恭喜！您的帖子「' + candidate.wall.storyTitle + '」被选为每日精选，奖励 ' + REWARD_POINTS + ' 积分！'
        })
      }
    })

    await this.logOperation(adminOpenid, 'APPROVE_HIGHLIGHT_CANDIDATE', 'highlight', candidateId)
    return { approved: true, rewardPoints: REWARD_POINTS }
  },


  // Reject highlight candidate
  async rejectCandidate({ candidateId, userId }) {
    const adminOpenid = await this.getAdminOpenid(userId)

    const candidate = await prisma.highlightCandidate.findUnique({
      where: { id: candidateId }
    })

    if (!candidate) {
      throw { status: 404, code: 'NOT_FOUND', message: '候选不存在' }
    }
    if (candidate.status !== 'pending') {
      throw { status: 400, code: 'ALREADY_PROCESSED', message: '该候选已被处理' }
    }

    await prisma.highlightCandidate.update({
      where: { id: candidateId },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewerOpenid: adminOpenid
      }
    })

    await this.logOperation(adminOpenid, 'REJECT_HIGHLIGHT_CANDIDATE', 'highlight', candidateId)
    return { rejected: true }
  },


  // Batch approve highlight candidates
  async batchApproveCandidates({ candidateIds, userId }) {
    const adminOpenid = await this.getAdminOpenid(userId)
    const REWARD_POINTS = 20

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      throw { status: 400, code: 'INVALID_INPUT', message: '请选择要确认的候选' }
    }

    const candidates = await prisma.highlightCandidate.findMany({
      where: { id: { in: candidateIds }, status: 'pending' },
      include: { wall: true }
    })

    if (candidates.length === 0) {
      throw { status: 400, code: 'NO_PENDING', message: '没有待确认的候选' }
    }

    const approvedIds = []

    await prisma.$transaction(async (tx) => {
      for (const candidate of candidates) {
        if (!candidate.wall || candidate.wall.isFeatured) continue

        await tx.dreamWall.update({
          where: { id: candidate.wallId },
          data: { isFeatured: true, featuredAt: new Date() }
        })

        await tx.dailyHighlight.create({
          data: {
            wallId: candidate.wallId,
            rewardPoints: REWARD_POINTS,
            operatorOpenid: adminOpenid
          }
        })

        await tx.highlightCandidate.update({
          where: { id: candidate.id },
          data: {
            status: 'approved',
            reviewedAt: new Date(),
            reviewerOpenid: adminOpenid
          }
        })

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
          message: '恭喜！您的帖子「' + candidate.wall.storyTitle + '」被选为每日精选，奖励 ' + REWARD_POINTS + ' 积分！'
        })

        approvedIds.push(candidate.id)
      }
    })

    await this.logOperation(adminOpenid, 'BATCH_APPROVE_HIGHLIGHT_CANDIDATES', 'highlight', null, approvedIds)
    return { approved: true, count: approvedIds.length }
  },


  // Get comments for admin
  async getComments({ page = 1, limit = 50, wallId }) {
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
        include: { wall: { select: { storyTitle: true } } }
      }),
      prisma.dreamWallComment.count({ where })
    ])

    return {
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
    }
  },

  // Delete a comment
  async deleteComment({ commentId }) {
    const comment = await prisma.dreamWallComment.findUnique({
      where: { id: commentId },
      include: { wall: true }
    })

    if (!comment) {
      throw { status: 404, code: 'NOT_FOUND', message: '评论不存在' }
    }

    await prisma.dreamWallComment.delete({ where: { id: commentId } })

    if (comment.wall) {
      await prisma.dreamWall.update({
        where: { id: comment.wallId },
        data: { commentCount: { decrement: 1 } }
      })
    }

    return { deleted: true }
  },


  // Get admin statistics
  async getStats() {
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
      prisma.dreamWall.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.dreamWall.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.dreamWall.count({ where: { status: 'approved', updatedAt: { gte: sevenDaysAgo } } }),
      prisma.dreamWall.count({ where: { status: 'rejected', updatedAt: { gte: sevenDaysAgo } } })
    ])

    const postsGrowth = postsLast7To14Days > 0
      ? Math.round(((postsLast7Days - postsLast7To14Days) / postsLast7To14Days) * 100)
      : postsLast7Days > 0 ? 100 : 0

    return {
      pendingPosts: pendingCount,
      totalPosts,
      totalComments,
      trends: {
        postsLast7Days,
        postsGrowth,
        approvedLast7Days,
        rejectedLast7Days
      },
      dailyStats: await getDailyStats(prisma, sevenDaysAgo, now)
    }
  },


  // Upgrade story asset quality level
  async upgradeAsset({ sessionId, qualityLevel }) {
    if (!['normal', 'premium', 'curated'].includes(qualityLevel)) {
      throw { status: 400, code: 'INVALID_QUALITY', message: '无效的质量等级' }
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { story: true }
    })

    if (!session || !session.story) {
      throw { status: 404, code: 'NOT_FOUND', message: '故事不存在' }
    }

    let asset = await prisma.storyAsset.findUnique({ where: { sessionId } })

    if (!asset) {
      asset = await prisma.storyAsset.create({
        data: { sessionId, openid: session.openid, qualityLevel }
      })
    } else {
      asset = await prisma.storyAsset.update({
        where: { sessionId },
        data: { qualityLevel }
      })
    }

    return { asset }
  },


  // Get collections
  async getCollections({ page = 1, limit = 20, status }) {
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where = status ? { status } : {}

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: parseInt(limit),
        include: { _count: { select: { episodes: true } } }
      }),
      prisma.collection.count({ where })
    ])

    return {
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
    }
  },

  // Create collection
  async createCollection({ title, description, cover, theme, order = 0 }) {
    if (!title) {
      throw { status: 400, code: 'MISSING_TITLE', message: '请填写合集标题' }
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

    return { collection }
  },

  // Update collection
  async updateCollection({ id, title, description, cover, theme, status, order }) {
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

    return { collection }
  },

  // Delete collection
  async deleteCollection({ id }) {
    await prisma.collection.delete({ where: { id } })
    return { deleted: true }
  },


  // Add episode to collection
  async addEpisode({ collectionId, sessionId, title, excerpt, order }) {
    if (!sessionId) {
      throw { status: 400, code: 'MISSING_SESSION', message: '缺少 sessionId' }
    }

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } })
    if (!collection) {
      throw { status: 404, code: 'NOT_FOUND', message: '合集不存在' }
    }

    const existing = await prisma.episode.findUnique({ where: { sessionId } })
    if (existing) {
      throw { status: 400, code: 'ALREADY_EXISTS', message: '该故事已在其他合集中' }
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { story: true }
    })
    if (!session || !session.story) {
      throw { status: 404, code: 'NOT_FOUND', message: '故事不存在' }
    }

    let asset = await prisma.storyAsset.findUnique({ where: { sessionId } })
    if (!asset) {
      asset = await prisma.storyAsset.create({
        data: { sessionId, openid: session.openid, qualityLevel: 'premium' }
      })
    } else if (asset.qualityLevel === 'normal') {
      asset = await prisma.storyAsset.update({
        where: { sessionId },
        data: { qualityLevel: 'premium' }
      })
    }

    const maxOrder = await prisma.episode.aggregate({
      where: { collectionId },
      _max: { order: true }
    })

    const episode = await prisma.episode.create({
      data: {
        collectionId,
        sessionId,
        title: title || session.story.title,
        excerpt: excerpt || (session.dreamFragment ? session.dreamFragment.slice(0, 150) : ''),
        order: order ?? ((maxOrder._max.order ?? -1) + 1)
      }
    })

    return { episode }
  },

  // Remove episode from collection
  async removeEpisode({ episodeId }) {
    await prisma.episode.delete({ where: { id: episodeId } })
    return { deleted: true }
  },

  // Reorder episodes
  async reorderEpisodes({ collectionId, episodeIds }) {
    if (!Array.isArray(episodeIds)) {
      throw { status: 400, code: 'INVALID_ORDER', message: 'episodeIds 必须是数组' }
    }

    await prisma.$transaction(
      episodeIds.map((episodeId, index) =>
        prisma.episode.update({
          where: { id: episodeId },
          data: { order: index }
        })
      )
    )

    return { success: true }
  },


  // Auto upgrade qualified stories
  async autoUpgrade() {
    const qualifiedPosts = await prisma.dreamWall.findMany({
      where: {
        status: 'approved',
        likeCount: { gte: 20 },
        commentCount: { gte: 5 }
      },
      include: { session: { include: { story: true } } }
    })

    let upgradedCount = 0
    for (const post of qualifiedPosts) {
      const existing = await prisma.storyAsset.findUnique({
        where: { sessionId: post.sessionId }
      })

      if (!existing) {
        await prisma.storyAsset.create({
          data: {
            sessionId: post.sessionId,
            openid: post.openid,
            qualityLevel: 'premium'
          }
        })
        upgradedCount++
      } else if (existing.qualityLevel === 'normal') {
        await prisma.storyAsset.update({
          where: { sessionId: post.sessionId },
          data: { qualityLevel: 'premium' }
        })
        upgradedCount++
      }
    }

    return { upgradedCount, totalScanned: qualifiedPosts.length }
  },

  // Generate asset candidates
  async generateAssetCandidates() {
    const qualifiedPosts = await prisma.dreamWall.findMany({
      where: { status: 'approved' },
      include: { session: { include: { story: true } } }
    })

    let generatedCount = 0
    const engagementScore = (likeCount, commentCount) => likeCount * 1 + commentCount * 2

    for (const post of qualifiedPosts) {
      const existingAsset = await prisma.storyAsset.findUnique({
        where: { sessionId: post.sessionId }
      })
      if (existingAsset && existingAsset.qualityLevel !== 'normal') continue

      const existingCandidate = await prisma.storyAssetCandidate.findUnique({
        where: { sessionId: post.sessionId }
      })
      if (existingCandidate && existingCandidate.status === 'pending') continue

      let targetLevel = null
      if (post.likeCount >= 30 && post.commentCount >= 10) {
        targetLevel = 'curated'
      } else if (post.likeCount >= 10 && post.commentCount >= 3) {
        targetLevel = 'premium'
      }

      if (!targetLevel) continue

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

    return { generatedCount, totalScanned: qualifiedPosts.length }
  },


  // Get asset candidates
  async getAssetCandidates({ status = 'pending', page = 1, limit = 20 }) {
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
              story: { select: { id: true, title: true } }
            }
          }
        }
      }),
      prisma.storyAssetCandidate.count({ where })
    ])

    return {
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
    }
  },

  // Approve asset candidate
  async approveAssetCandidate({ sessionId, userId }) {
    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin) {
      throw { status: 404, code: 'NOT_FOUND', message: '管理员不存在' }
    }

    const candidate = await prisma.storyAssetCandidate.findUnique({ where: { sessionId } })
    if (!candidate) {
      throw { status: 404, code: 'NOT_FOUND', message: '候选不存在' }
    }

    await prisma.$transaction(async (tx) => {
      const existingAsset = await tx.storyAsset.findUnique({ where: { sessionId } })

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

      await tx.storyAssetCandidate.update({
        where: { sessionId },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewerOpenid: admin.openid
        }
      })
    })

    return { message: '已确认候选' }
  },

  // Reject asset candidate
  async rejectAssetCandidate({ sessionId, userId }) {
    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin) {
      throw { status: 404, code: 'NOT_FOUND', message: '管理员不存在' }
    }

    const candidate = await prisma.storyAssetCandidate.findUnique({ where: { sessionId } })
    if (!candidate) {
      throw { status: 404, code: 'NOT_FOUND', message: '候选不存在' }
    }

    await prisma.storyAssetCandidate.update({
      where: { sessionId },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewerOpenid: admin.openid
      }
    })

    return { message: '已拒绝候选' }
  },

}
