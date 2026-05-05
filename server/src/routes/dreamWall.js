import { prisma } from '../config/database.js'
import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'
import { createNotification } from '../services/notificationService.js'
import { checkContentSafety } from '../services/contentSafety.js'
import { successResponse, errorResponse } from '../config/response.js'

export default async function dreamWallRoutes(fastify) {
  // GET /api/wall - 获取梦墙列表 (公开)
  fastify.get('/wall', async (req, res) => {
    try {
    const { tab = 'all', page = '1', limit = '20', keyword, openid: userOpenid } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {
      status: 'approved',
      visibility: 'public'
    }

    // Keyword search (title + snippet)
    if (keyword) {
      where.OR = [
        { storyTitle: { contains: keyword, mode: 'insensitive' } },
        { storySnippet: { contains: keyword, mode: 'insensitive' } }
      ]
    }

    // Tab filtering
    if (tab === 'featured') {
      // Featured algorithm: 30天内, 按综合分(点赞+评论*2)排序
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Build where clause for featured tab
      const featuredWhere = {
        status: 'approved',
        visibility: 'public',
        createdAt: { gte: thirtyDaysAgo }
      }

      // Keyword search (title + snippet)
      if (keyword) {
        featuredWhere.OR = [
          { storyTitle: { contains: keyword, mode: 'insensitive' } },
          { storySnippet: { contains: keyword, mode: 'insensitive' } }
        ]
      }

      // For featured tab, sort by engagement score (likeCount + commentCount * 2)
      // Fetch extra posts to ensure we have enough after sorting by engagement
      const [posts, total] = await Promise.all([
        prisma.dreamWall.findMany({
          where: featuredWhere,
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 100, // Fetch enough posts for reliable engagement sorting
          include: {
            likes: { take: 1, select: { openid: true } },
            favorites: { take: 1, select: { openid: true } },
            session: { select: { dreamFragment: true } }
          }
        }),
        prisma.dreamWall.count({
          where: featuredWhere
        })
      ])

      // Sort by engagement score (likeCount + commentCount * 2)
      posts.sort((a, b) => {
        const scoreA = a.likeCount + a.commentCount * 2
        const scoreB = b.likeCount + b.commentCount * 2
        if (scoreB !== scoreA) return scoreB - scoreA
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      // Apply pagination after sorting
      const paginatedPosts = posts.slice(skip, skip + parseInt(limit))

      // Get friend relationships for the current user
      // Note: Friend.userId and Friend.friendId store User.id (internal cuid), not User.openid
      let friendOpenidSet = new Set()
      if (userOpenid && posts.length > 0) {
        const postOpenids = [...new Set(posts.map(p => p.openid))]

        // Look up internal User ids from openids
        const currentUser = await prisma.user.findUnique({ where: { openid: userOpenid } })
        const postAuthors = await prisma.user.findMany({
          where: { openid: { in: postOpenids } },
          select: { id: true, openid: true }
        })
        const authorIdToOpenid = new Map(postAuthors.map(a => [a.id, a.openid]))
        const authorOpenidsSet = new Set(postOpenids)

        if (currentUser) {
          const friends = await prisma.friend.findMany({
            where: {
              status: 'ACCEPTED',
              OR: [
                { userId: currentUser.id, friendId: { in: [...authorIdToOpenid.keys()] } },
                { friendId: currentUser.id, userId: { in: [...authorIdToOpenid.keys()] } }
              ]
            }
          })
          friends.forEach(f => {
            // Get the friend's openid from the authorIdToOpenid map
            const friendId = f.userId === currentUser.id ? f.friendId : f.userId
            const friendOpenid = authorIdToOpenid.get(friendId)
            if (friendOpenid && authorOpenidsSet.has(friendOpenid)) {
              friendOpenidSet.add(friendOpenid)
            }
          })
        }
      }

      // Check if posts are in current user's story favorites
      const ownStorySessionIds = new Set()
      if (userOpenid && posts.length > 0) {
        const sessionIds = posts.map(p => p.sessionId).filter(Boolean)
        const storyFavs = await prisma.storyFavorite.findMany({
          where: { openid: userOpenid, sessionId: { in: sessionIds } },
          select: { sessionId: true }
        })
        storyFavs.forEach(sf => ownStorySessionIds.add(sf.sessionId))
      }

      const isOwnPost = (post) => post.openid === userOpenid

      const items = paginatedPosts.map(post => ({
        id: post.id,
        sessionId: post.sessionId,
        openid: post.openid,
        storyTitle: post.storyTitle,
        storySnippet: post.storySnippet,
        storyFull: post.storyFull,
        dreamFragment: post.session?.dreamFragment,
        isAnonymous: post.isAnonymous,
        isOwnStory: isOwnPost(post),
        nickname: isOwnPost(post) ? '我的故事' : (post.isAnonymous ? '匿名用户' : post.nickname),
        avatar: post.isAnonymous ? null : post.avatar,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        isFeatured: post.isFeatured,
        createdAt: post.createdAt,
        hasLiked: userOpenid ? post.likes.some(l => l.openid === userOpenid) : false,
        isFavorite: userOpenid ? post.favorites.some(f => f.openid === userOpenid) : false,
        isFriend: userOpenid ? friendOpenidSet.has(post.openid) : false,
        engagementScore: post.likeCount + post.commentCount * 2
      }))

      return successResponse({
        posts: items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          hasMore: skip + items.length < total
        }
      })
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
          favorites: { take: 1, select: { openid: true } },
          _count: { select: { comments: true } },
          session: { select: { dreamFragment: true } }
        }
      }),
      prisma.dreamWall.count({ where })
    ])

    // Get friend relationships for the current user
    // Note: Friend.userId and Friend.friendId store User.id (internal cuid), not User.openid
    let friendOpenidSet = new Set()
    if (userOpenid && posts.length > 0) {
      const postOpenids = [...new Set(posts.map(p => p.openid))]

      // Look up internal User ids from openids
      const currentUser = await prisma.user.findUnique({ where: { openid: userOpenid } })
      const postAuthors = await prisma.user.findMany({
        where: { openid: { in: postOpenids } },
        select: { id: true, openid: true }
      })
      const authorIdToOpenid = new Map(postAuthors.map(a => [a.id, a.openid]))
      const authorOpenidsSet = new Set(postOpenids)

      if (currentUser) {
        const friends = await prisma.friend.findMany({
          where: {
            status: 'ACCEPTED',
            OR: [
              { userId: currentUser.id, friendId: { in: [...authorIdToOpenid.keys()] } },
              { friendId: currentUser.id, userId: { in: [...authorIdToOpenid.keys()] } }
            ]
          }
        })
        friends.forEach(f => {
          // Get the friend's openid from the authorIdToOpenid map
          const friendId = f.userId === currentUser.id ? f.friendId : f.userId
          const friendOpenid = authorIdToOpenid.get(friendId)
          if (friendOpenid && authorOpenidsSet.has(friendOpenid)) {
            friendOpenidSet.add(friendOpenid)
          }
        })
      }
    }

    // Check if posts are in current user's story favorites
    const ownStorySessionIds = new Set()
    if (userOpenid && posts.length > 0) {
      const sessionIds = posts.map(p => p.sessionId).filter(Boolean)
      const storyFavs = await prisma.storyFavorite.findMany({
        where: { openid: userOpenid, sessionId: { in: sessionIds } },
        select: { sessionId: true }
      })
      storyFavs.forEach(sf => ownStorySessionIds.add(sf.sessionId))
    }

    const isOwnPost = (post) => post.openid === userOpenid

    // Transform response
    const items = posts.map(post => ({
      id: post.id,
      sessionId: post.sessionId,
      openid: post.openid, // 作者 openid，用于权限判断
      storyTitle: post.storyTitle,
      storySnippet: post.storySnippet,
      storyFull: post.storyFull, // Include full story for direct navigation
      dreamFragment: post.session?.dreamFragment,
      isAnonymous: post.isAnonymous,
      isOwnStory: isOwnPost(post),
      nickname: isOwnPost(post) ? '我的故事' : (post.isAnonymous ? '匿名用户' : post.nickname),
      avatar: post.isAnonymous ? null : post.avatar,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isFeatured: post.isFeatured,
      createdAt: post.createdAt,
      hasLiked: userOpenid ? post.likes.some(l => l.openid === userOpenid) : false,
      isFavorite: userOpenid ? post.favorites.some(f => f.openid === userOpenid) : false,
      isFriend: userOpenid ? friendOpenidSet.has(post.openid) : false
    }))

    return successResponse({
      posts: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: skip + items.length < total
      }
    })
    } catch (error) {
      console.error('Error in GET /wall:', error)
      return res.status(500).send(errorResponse('服务器错误: ' + error.message, 'SERVER_ERROR'))
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
      return res.status(400).send(errorResponse('缺少必要参数', 'MISSING_PARAMS'))
    }

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send(errorResponse('无权操作', 'FORBIDDEN'))
    }

    // Get user's story
    const story = await prisma.story.findUnique({
      where: { sessionId },
      include: { session: true }
    })

    if (!story) {
      return res.status(404).send(errorResponse('故事不存在', 'NOT_FOUND'))
    }

    // Verify ownership
    if (story.session.openid !== openid) {
      return res.status(403).send(errorResponse('无权操作', 'FORBIDDEN'))
    }

    // Check if already posted
    const existing = await prisma.dreamWall.findUnique({
      where: { sessionId }
    })

    if (existing) {
      return res.status(409).send(errorResponse('该故事已在梦墙发布', 'ALREADY_PUBLISHED'))
    }

    // Content safety check
    const contentToCheck = story.title + ' ' + story.content
    const safety = await checkContentSafety(contentToCheck)

    let status
    let rejectReason = null

    if (safety.verdict === 'blocked') {
      // Blocked: rejected immediately, notify user
      status = 'rejected'
      rejectReason = safety.reason || '内容包含违规信息'
    } else if (safety.verdict === 'review') {
      // Review: pending, needs admin approval
      status = 'pending'
    } else {
      // Safe: auto-approve
      status = 'approved'
    }

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

    if (status === 'rejected') {
      // Notify user their post was rejected
      await createNotification(prisma, {
        openid,
        type: 'POST_REJECTED',
        fromOpenid: 'system',
        fromNickname: '系统',
        targetId: post.id,
        targetTitle: story.title,
        message: `您的帖子「${story.title}」因【${rejectReason}】已被撤回`
      }).catch(err => req.log.error({ err }, 'Failed to create rejection notification'))

      return {
        success: false,
        reason: '内容审核未通过：' + rejectReason
      }
    } else if (status === 'pending') {
      return successResponse({
        post: { id: post.id },
        message: '内容待审核，审核通过后将显示在梦墙'
      })
    } else {
      return successResponse({
        post: { id: post.id },
        message: '发布成功'
      })
    }
  })

  // GET /api/wall/friends - 获取关注的人的帖子 (需登录)
  fastify.get('/wall/friends', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { page = '1', limit = '20' } = req.query
      const skip = (parseInt(page) - 1) * parseInt(limit)

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      // Find all ACCEPTED friend records where userId = current user
      const friends = await prisma.friend.findMany({
        where: {
          userId: tokenUser.id,
          status: 'ACCEPTED'
        },
        select: {
          friendId: true
        }
      })

      const friendInternalIds = friends.map(f => f.friendId)

      if (friendInternalIds.length === 0) {
        return {
          posts: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            hasMore: false
          }
        }
      }

      // Look up openids for these friends (Friend.friendId stores internal User.id, not openid)
      const friendUsers = await prisma.user.findMany({
        where: { id: { in: friendInternalIds } },
        select: { openid: true }
      })
      const friendOpenids = friendUsers.map(u => u.openid)

      // Query DreamWall where openid IN friendOpenids AND status='approved' AND visibility='public'
      const [posts, total] = await Promise.all([
        prisma.dreamWall.findMany({
          where: {
            openid: { in: friendOpenids },
            status: 'approved',
            visibility: 'public'
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
          include: {
            likes: { take: 1, select: { openid: true } },
            favorites: { take: 1, select: { openid: true } },
            _count: { select: { comments: true } }
          }
        }),
        prisma.dreamWall.count({
          where: {
            openid: { in: friendOpenids },
            status: 'approved',
            visibility: 'public'
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
        hasLiked: post.likes.some(l => l.openid === tokenUser.openid),
        isFavorite: post.favorites.some(f => f.openid === tokenUser.openid)
      }))

      return successResponse({
        posts: items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          hasMore: skip + items.length < total
        }
      })
    } catch (error) {
      console.error('Error fetching friends feed:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
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
      return res.status(403).send(errorResponse('无权操作', 'FORBIDDEN'))
    }

    const posts = await prisma.dreamWall.findMany({
      where: { openid },
      orderBy: { createdAt: 'desc' }
    })

    return successResponse({
      posts: posts.map(p => ({
        id: p.id,
        sessionId: p.sessionId,
        storyTitle: p.storyTitle,
        storySnippet: p.storySnippet,
        storyFull: p.storyFull,
        isAnonymous: p.isAnonymous,
        isOwnStory: true,
        nickname: '我的故事',
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        status: p.status,
        isFeatured: p.isFeatured,
        createdAt: p.createdAt
      }))
    })
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
      return res.status(400).send(errorResponse('缺少 openid', 'MISSING_PARAMS'))
    }

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send(errorResponse('无权操作', 'FORBIDDEN'))
    }

    const post = await prisma.dreamWall.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return res.status(404).send(errorResponse('帖子不存在', 'NOT_FOUND'))
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

      return successResponse({ liked: false })
    } else {
      // Like
      await prisma.dreamWallLike.create({
        data: { wallId: postId, openid }
      })

      await prisma.dreamWall.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } }
      })

      // Create LIKE notification for post author (fire-and-forget)
      const liker = await prisma.user.findUnique({
        where: { openid },
        select: { nickname: true }
      })
      createNotification(prisma, {
        openid: post.openid,
        type: 'LIKE',
        fromOpenid: openid,
        fromNickname: liker?.nickname || '匿名用户',
        targetId: post.sessionId,
        targetTitle: post.storyTitle,
        message: `${liker?.nickname || '匿名用户'} 点赞了你的故事《${post.storyTitle}》`
      }).catch(err => {
        req.log.error({ err }, 'Failed to create notification')
      })

      return successResponse({ liked: true })
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
      return res.status(404).send(errorResponse('帖子不存在', 'NOT_FOUND'))
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

    return successResponse({
      comments: topLevelComments
    })
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
      return res.status(400).send(errorResponse('缺少必要参数', 'MISSING_PARAMS'))
    }

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send(errorResponse('无权操作', 'FORBIDDEN'))
    }

    if (content.length > 500) {
      return res.status(400).send(errorResponse('评论字数不超过500', 'INVALID_CONTENT'))
    }

    const post = await prisma.dreamWall.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return res.status(404).send(errorResponse('帖子不存在', 'NOT_FOUND'))
    }

    // If parentId is provided, validate it
    if (parentId) {
      const parentComment = await prisma.dreamWallComment.findUnique({
        where: { id: parentId }
      })

      if (!parentComment) {
        return res.status(404).send(errorResponse('父评论不存在', 'NOT_FOUND'))
      }

      if (parentComment.wallId !== postId) {
        return res.status(400).send(errorResponse('父评论不属于该帖子', 'INVALID_PARENT'))
      }

      // Max 2 levels: parent must not be a reply itself
      if (parentComment.parentId !== null) {
        return res.status(400).send(errorResponse('不能回复二级评论', 'INVALID_NESTING'))
      }
    }

    // Content safety check
    const safety = await checkContentSafety(content)
    if (safety.verdict !== 'safe') {
      const reason = safety.reason || '内容包含敏感信息'
      return res.status(400).send(errorResponse(reason, 'VALIDATION_ERROR'))
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

    // Create COMMENT notification for post author (fire-and-forget)
    createNotification(prisma, {
      openid: post.openid,
      type: 'COMMENT',
      fromOpenid: openid,
      fromNickname: user?.nickname || '匿名用户',
      targetId: post.sessionId,
      targetTitle: post.storyTitle,
      message: `${user?.nickname || '匿名用户'} 评论了你的故事`
    }).catch(err => {
      req.log.error({ err }, 'Failed to create notification')
    })

    return successResponse({
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
    })
  })

  // POST /api/wall/:postId/favorite - 收藏/取消收藏 (需登录)
  fastify.post('/wall/:postId/favorite', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { postId } = req.params
    const { openid } = req.body

    if (!openid) {
      return res.status(400).send(errorResponse('缺少 openid', 'MISSING_PARAMS'))
    }

    // Verify the openid matches the token user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      return res.status(403).send(errorResponse('无权操作', 'FORBIDDEN'))
    }

    const post = await prisma.dreamWall.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return res.status(404).send(errorResponse('帖子不存在', 'NOT_FOUND'))
    }

    // Check if already favorited
    const existingFavorite = await prisma.dreamWallFavorite.findUnique({
      where: {
        wallId_openid: { wallId: postId, openid }
      }
    })

    if (existingFavorite) {
      // Remove favorite
      await prisma.dreamWallFavorite.delete({
        where: { id: existingFavorite.id }
      })

      return successResponse({ favorited: false })
    } else {
      // Add favorite
      await prisma.dreamWallFavorite.create({
        data: { wallId: postId, openid }
      })

      return successResponse({ favorited: true })
    }
  })

  // GET /api/wall/favorites - 获取我的收藏列表 (需登录)
  fastify.get('/wall/favorites', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const { page = '1', limit = '20' } = req.query
      const skip = (parseInt(page) - 1) * parseInt(limit)

      // Get authenticated user
      const tokenUser = await authService.getUser(req.userId)
      if (!tokenUser) {
        return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
      }

      const [favorites, total] = await Promise.all([
        prisma.dreamWallFavorite.findMany({
          where: { openid: tokenUser.openid },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
          include: {
            wall: {
              include: {
                likes: { take: 1, select: { openid: true } }
              }
            }
          }
        }),
        prisma.dreamWallFavorite.count({
          where: { openid: tokenUser.openid }
        })
      ])

      const posts = favorites
        .filter(f => f.wall.status === 'approved')
        .map(f => ({
          id: f.wall.id,
          sessionId: f.wall.sessionId,
          openid: f.wall.openid,
          storyTitle: f.wall.storyTitle,
          storySnippet: f.wall.storySnippet,
          storyFull: f.wall.storyFull,
          isAnonymous: f.wall.isAnonymous,
          nickname: f.wall.isAnonymous ? '匿名用户' : f.wall.nickname,
          avatar: f.wall.isAnonymous ? null : f.wall.avatar,
          likeCount: f.wall.likeCount,
          commentCount: f.wall.commentCount,
          isFeatured: f.wall.isFeatured,
          createdAt: f.wall.createdAt,
          hasLiked: f.wall.likes.some(l => l.openid === tokenUser.openid),
          isFavorite: true
        }))

      return successResponse({
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          hasMore: skip + posts.length < total
        }
      })
    } catch (error) {
      console.error('Error fetching favorites:', error)
      return res.status(500).send(errorResponse('服务器错误', 'SERVER_ERROR'))
    }
  })

  // POST /api/wall/favorites/story/:sessionId - 收藏/取消收藏自己的故事（需登录）
  fastify.post('/wall/favorites/story/:sessionId', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { sessionId } = req.params

    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
    }

    // Check if already favorited
    const existing = await prisma.storyFavorite.findUnique({
      where: {
        sessionId_openid: {
          sessionId,
          openid: tokenUser.openid
        }
      }
    })

    if (existing) {
      // Remove favorite
      await prisma.storyFavorite.delete({
        where: { id: existing.id }
      })
      return successResponse({ favorited: false })
    } else {
      // Add favorite
      await prisma.storyFavorite.create({
        data: {
          sessionId,
          openid: tokenUser.openid
        }
      })
      return successResponse({ favorited: true })
    }
  })

  // GET /api/wall/favorites/story - 获取我收藏的故事列表（需登录）
  fastify.get('/wall/favorites/story', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send(errorResponse('用户未找到', 'USER_NOT_FOUND'))
    }

    const favorites = await prisma.storyFavorite.findMany({
      where: { openid: tokenUser.openid },
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          include: {
            story: {
              select: {
                title: true,
                content: true
              }
            }
          }
        }
      }
    })

    const stories = favorites
      .filter(f => f.session?.story)
      .map(f => ({
        sessionId: f.sessionId,
        storyTitle: f.session.story.title,
        story: f.session.story.content,
        createdAt: f.createdAt.toISOString(),
        date: f.session.completedAt?.toISOString() || f.session.updatedAt.toISOString()
      }))

    return successResponse({ stories })
  })
}
