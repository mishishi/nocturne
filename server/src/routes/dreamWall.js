import { prisma } from '../config/database.js'
import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'

// Content moderation check (simplified - in production use a proper service)
function checkContentSafety(text) {
  // Basic checks - in production use AI-based moderation
  const blockedPatterns = [
    /[0-9]{11,}/, // Phone numbers
    /[0-9]{15,}/, // ID numbers
  ]

  for (const pattern of blockedPatterns) {
    if (pattern.test(text)) {
      return { safe: false, reason: '内容包含敏感信息' }
    }
  }

  return { safe: true }
}

export default async function dreamWallRoutes(fastify) {
  // GET /api/wall - 获取梦墙列表 (公开)
  fastify.get('/wall', async (req, res) => {
    const { tab = 'all', page = '1', limit = '20' } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {
      status: 'approved',
      visibility: 'public'
    }

    // Tab filtering
    if (tab === 'featured') {
      // Featured algorithm: 30天内, 按综合分(点赞+评论*2)排序
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [posts, total] = await Promise.all([
        prisma.dreamWall.findMany({
          where: {
            status: 'approved',
            visibility: 'public',
            createdAt: { gte: thirtyDaysAgo }
          },
          orderBy: [
            { likeCount: 'desc' },
            { commentCount: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: parseInt(limit),
          include: {
            likes: { take: 1, select: { openid: true } }
          }
        }),
        prisma.dreamWall.count({
          where: {
            status: 'approved',
            visibility: 'public',
            createdAt: { gte: thirtyDaysAgo }
          }
        })
      ])

      const items = posts.map(post => ({
        id: post.id,
        sessionId: post.sessionId,
        openid: post.openid,
        storyTitle: post.storyTitle,
        storySnippet: post.storySnippet,
        storyFull: post.storyFull,
        isAnonymous: post.isAnonymous,
        nickname: post.isAnonymous ? '匿名用户' : post.nickname,
        avatar: post.isAnonymous ? null : post.avatar,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        isFeatured: post.isFeatured,
        createdAt: post.createdAt,
        hasLiked: false,
        engagementScore: post.likeCount + post.commentCount * 2
      }))

      return {
        posts: items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          hasMore: skip + items.length < total
        }
      }
    }

    const [posts, total] = await Promise.all([
      prisma.dreamWall.findMany({
        where,
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: parseInt(limit),
        include: {
          likes: { take: 1, select: { openid: true } },
          _count: { select: { comments: true } }
        }
      }),
      prisma.dreamWall.count({ where })
    ])

    // Transform response
    const items = posts.map(post => ({
      id: post.id,
      sessionId: post.sessionId,
      openid: post.openid, // 作者 openid，用于权限判断
      storyTitle: post.storyTitle,
      storySnippet: post.storySnippet,
      storyFull: post.storyFull, // Include full story for direct navigation
      isAnonymous: post.isAnonymous,
      nickname: post.isAnonymous ? '匿名用户' : post.nickname,
      avatar: post.isAnonymous ? null : post.avatar,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isFeatured: post.isFeatured,
      createdAt: post.createdAt,
      hasLiked: false // Will be set if user is logged in
    }))

    return {
      posts: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: skip + items.length < total
      }
    }
  })

  // POST /api/wall - 发布到梦墙 (需登录)
  fastify.post('/wall', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { openid, sessionId, isAnonymous = true, visibility = 'public' } = req.body

    if (!openid || !sessionId) {
      return res.status(400).send({ success: false, reason: '缺少必要参数' })
    }

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    // Get user's story
    const story = await prisma.story.findUnique({
      where: { sessionId },
      include: { session: true }
    })

    if (!story) {
      return res.status(404).send({ success: false, reason: '故事不存在' })
    }

    // Verify ownership
    if (story.session.openid !== openid) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    // Check if already posted
    const existing = await prisma.dreamWall.findUnique({
      where: { sessionId }
    })

    if (existing) {
      return res.status(409).send({ success: false, reason: '该故事已在梦墙发布' })
    }

    // Content safety check
    const contentToCheck = story.title + ' ' + story.content
    const safety = checkContentSafety(contentToCheck)

    const status = safety.safe ? 'approved' : 'pending'

    // Get user info for snapshot
    const user = await prisma.user.findUnique({
      where: { openid }
    })

    // Create wall post
    const post = await prisma.dreamWall.create({
      data: {
        sessionId,
        openid,
        nickname: user?.nickname || '匿名用户',
        avatar: user?.avatar,
        storyTitle: story.title,
        storySnippet: story.content.slice(0, 200) + (story.content.length > 200 ? '...' : ''),
        storyFull: story.content,
        isAnonymous,
        visibility,
        status,
        likeCount: 0,
        commentCount: 0
      }
    })

    if (status === 'approved') {
      return { success: true, post: { id: post.id }, message: '发布成功' }
    } else {
      return { success: true, post: { id: post.id }, message: '内容待审核，审核通过后将显示在梦墙' }
    }
  })

  // GET /api/wall/my - 获取我发布的 (需登录)
  fastify.get('/wall/my', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { openid } = req.query

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    const posts = await prisma.dreamWall.findMany({
      where: { openid },
      orderBy: { createdAt: 'desc' }
    })

    return {
      success: true,
      posts: posts.map(p => ({
        id: p.id,
        sessionId: p.sessionId,
        storyTitle: p.storyTitle,
        storySnippet: p.storySnippet,
        storyFull: p.storyFull,
        isAnonymous: p.isAnonymous,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        status: p.status,
        isFeatured: p.isFeatured,
        createdAt: p.createdAt
      }))
    }
  })

  // POST /api/wall/:postId/like - 点赞/取消点赞 (需登录)
  fastify.post('/wall/:postId/like', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { postId } = req.params
    const { openid } = req.body

    if (!openid) {
      return res.status(400).send({ success: false, reason: '缺少 openid' })
    }

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    const post = await prisma.dreamWall.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return res.status(404).send({ success: false, reason: '帖子不存在' })
    }

    // Check if already liked
    const existingLike = await prisma.dreamWallLike.findUnique({
      where: {
        wallId_openid: { wallId: postId, openid }
      }
    })

    if (existingLike) {
      // Unlike
      await prisma.dreamWallLike.delete({
        where: { id: existingLike.id }
      })

      await prisma.dreamWall.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } }
      })

      return { success: true, liked: false }
    } else {
      // Like
      await prisma.dreamWallLike.create({
        data: { wallId: postId, openid }
      })

      await prisma.dreamWall.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } }
      })

      return { success: true, liked: true }
    }
  })

  // GET /api/wall/:postId/comments - 获取评论 (嵌套结构)
  fastify.get('/wall/:postId/comments', async (req, res) => {
    const { postId } = req.params

    // Get wall post to determine isAuthor
    const wallPost = await prisma.dreamWall.findUnique({
      where: { id: postId },
      select: { openid: true }
    })

    if (!wallPost) {
      return res.status(404).send({ success: false, reason: '帖子不存在' })
    }

    // Fetch all comments with their replies
    const comments = await prisma.dreamWallComment.findMany({
      where: { wallId: postId },
      orderBy: { createdAt: 'asc' },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    // Build nested structure: top-level comments with replies
    const topLevelComments = comments
      .filter(c => !c.parentId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(c => ({
        id: c.id,
        content: c.content,
        isAnonymous: c.isAnonymous,
        nickname: c.isAnonymous ? '匿名用户' : c.nickname,
        avatar: c.isAnonymous ? null : c.avatar,
        isAuthor: c.openid === wallPost.openid,
        parentId: c.parentId,
        createdAt: c.createdAt,
        replies: c.replies.map(r => ({
          id: r.id,
          content: r.content,
          isAnonymous: r.isAnonymous,
          nickname: r.isAnonymous ? '匿名用户' : r.nickname,
          avatar: r.isAnonymous ? null : r.avatar,
          isAuthor: r.openid === wallPost.openid,
          parentId: r.parentId,
          createdAt: r.createdAt,
          replies: []
        }))
      }))

    return {
      success: true,
      comments: topLevelComments
    }
  })

  // POST /api/wall/:postId/comments - 添加评论 (需登录)
  fastify.post('/wall/:postId/comments', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { postId } = req.params
    const { openid, content, isAnonymous = true, parentId } = req.body

    if (!openid || !content) {
      return res.status(400).send({ success: false, reason: '缺少必要参数' })
    }

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    if (content.length > 500) {
      return res.status(400).send({ success: false, reason: '评论字数不超过500' })
    }

    const post = await prisma.dreamWall.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return res.status(404).send({ success: false, reason: '帖子不存在' })
    }

    // If parentId is provided, validate it
    if (parentId) {
      const parentComment = await prisma.dreamWallComment.findUnique({
        where: { id: parentId }
      })

      if (!parentComment) {
        return res.status(404).send({ success: false, reason: '父评论不存在' })
      }

      if (parentComment.wallId !== postId) {
        return res.status(400).send({ success: false, reason: '父评论不属于该帖子' })
      }

      // Max 2 levels: parent must not be a reply itself
      if (parentComment.parentId !== null) {
        return res.status(400).send({ success: false, reason: '不能回复二级评论' })
      }
    }

    // Content safety check
    const safety = checkContentSafety(content)
    if (!safety.safe) {
      return res.status(400).send({ success: false, reason: safety.reason })
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { openid }
    })

    const [comment] = await Promise.all([
      prisma.dreamWallComment.create({
        data: {
          wallId: postId,
          openid,
          nickname: user?.nickname || '匿名用户',
          avatar: user?.avatar,
          content,
          isAnonymous,
          parentId: parentId || null
        }
      }),
      prisma.dreamWall.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } }
      })
    ])

    return {
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        isAnonymous: comment.isAnonymous,
        nickname: comment.isAnonymous ? '匿名用户' : comment.nickname,
        avatar: comment.isAnonymous ? null : comment.avatar,
        parentId: comment.parentId,
        createdAt: comment.createdAt,
        replies: []
      }
    }
  })
}
