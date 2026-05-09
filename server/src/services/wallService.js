import { prisma } from '../config/database.js'
import { authService } from './authService.js'
import { createNotification } from './notificationService.js'
import { checkContentSafety } from './contentSafety.js'
import { successResponse, errorResponse } from '../config/response.js'
import { wallLogger } from '../utils/logger.js'

export const wallService = {
  async getWallList({ tab = 'all', page = '1', limit = '20', keyword, userOpenid }) {
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where = { status: 'approved', visibility: 'public' }
    if (keyword) {
      where.OR = [
        { storyTitle: { contains: keyword, mode: 'insensitive' } },
        { storySnippet: { contains: keyword, mode: 'insensitive' } }
      ]
    }
    if (tab === 'featured') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const featuredWhere = { ...where, createdAt: { gte: thirtyDaysAgo } }
      if (keyword) {
        featuredWhere.OR = [
          { storyTitle: { contains: keyword, mode: 'insensitive' } },
          { storySnippet: { contains: keyword, mode: 'insensitive' } }
        ]
      }
      const [posts, total] = await Promise.all([
        prisma.dreamWall.findMany({
          where: featuredWhere,
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 100,
          include: { likes: { select: { openid: true } }, favorites: { select: { openid: true } }, session: { select: { dreamFragment: true } } }
        }),
        prisma.dreamWall.count({ where: featuredWhere })
      ])
      posts.sort((a, b) => {
        const scoreA = a.likeCount + a.commentCount * 2
        const scoreB = b.likeCount + b.commentCount * 2
        if (scoreB !== scoreA) return scoreB - scoreA
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      const paginatedPosts = posts.slice(skip, skip + parseInt(limit))
      let friendOpenidSet = new Set()
      if (userOpenid && posts.length > 0) {
        const postOpenids = [...new Set(posts.map(p => p.openid))]
        const currentUser = await prisma.user.findUnique({ where: { openid: userOpenid } })
        const postAuthors = await prisma.user.findMany({ where: { openid: { in: postOpenids } }, select: { id: true, openid: true } })
        const authorIdToOpenid = new Map(postAuthors.map(a => [a.id, a.openid]))
        const authorOpenidsSet = new Set(postOpenids)
        if (currentUser) {
          const friends = await prisma.friend.findMany({
            where: { status: 'ACCEPTED', OR: [
              { userId: currentUser.id, friendId: { in: [...authorIdToOpenid.keys()] } },
              { friendId: currentUser.id, userId: { in: [...authorIdToOpenid.keys()] } }
            ] }
          })
          friends.forEach(f => {
            const friendId = f.userId === currentUser.id ? f.friendId : f.userId
            const friendOpenid = authorIdToOpenid.get(friendId)
            if (friendOpenid && authorOpenidsSet.has(friendOpenid)) friendOpenidSet.add(friendOpenid)
          })
        }
      }
      const ownStorySessionIds = new Set()
      if (userOpenid && posts.length > 0) {
        const sessionIds = posts.map(p => p.sessionId).filter(Boolean)
        const storyFavs = await prisma.storyFavorite.findMany({ where: { openid: userOpenid, sessionId: { in: sessionIds } }, select: { sessionId: true } })
        storyFavs.forEach(sf => ownStorySessionIds.add(sf.sessionId))
      }
      const isOwnPost = (post) => post.openid === userOpenid
      const items = paginatedPosts.map(post => ({
        id: post.id, sessionId: post.sessionId, openid: post.openid, storyTitle: post.storyTitle,
        storySnippet: post.storySnippet, storyFull: post.storyFull, dreamFragment: post.session?.dreamFragment,
        isAnonymous: post.isAnonymous, isOwnStory: isOwnPost(post),
        nickname: isOwnPost(post) ? '我的故事' : (post.isAnonymous ? '匿名用户' : post.nickname),
        avatar: post.isAnonymous ? null : post.avatar, likeCount: post.likeCount, commentCount: post.commentCount,
        isFeatured: post.isFeatured, createdAt: post.createdAt,
        hasLiked: userOpenid ? post.likes.some(l => l.openid === userOpenid) : false,
        isFavorite: userOpenid ? post.favorites.some(f => f.openid === userOpenid) : false,
        isFriend: userOpenid ? friendOpenidSet.has(post.openid) : false,
        engagementScore: post.likeCount + post.commentCount * 2
      }))
      return { posts: items, pagination: { page: parseInt(page), limit: parseInt(limit), total, hasMore: skip + items.length < total } }
    }
    const [posts, total] = await Promise.all([
      prisma.dreamWall.findMany({
        where, orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip, take: parseInt(limit),
        include: { likes: { select: { openid: true } }, favorites: { select: { openid: true } }, _count: { select: { comments: true } }, session: { select: { dreamFragment: true } } }
      }),
      prisma.dreamWall.count({ where })
    ])
    let friendOpenidSet = new Set()
    if (userOpenid && posts.length > 0) {
      const postOpenids = [...new Set(posts.map(p => p.openid))]
      const currentUser = await prisma.user.findUnique({ where: { openid: userOpenid } })
      const postAuthors = await prisma.user.findMany({ where: { openid: { in: postOpenids } }, select: { id: true, openid: true } })
      const authorIdToOpenid = new Map(postAuthors.map(a => [a.id, a.openid]))
      const authorOpenidsSet = new Set(postOpenids)
      if (currentUser) {
        const friends = await prisma.friend.findMany({
          where: { status: 'ACCEPTED', OR: [
            { userId: currentUser.id, friendId: { in: [...authorIdToOpenid.keys()] } },
            { friendId: currentUser.id, userId: { in: [...authorIdToOpenid.keys()] } }
          ] }
        })
        friends.forEach(f => {
          const friendId = f.userId === currentUser.id ? f.friendId : f.userId
          const friendOpenid = authorIdToOpenid.get(friendId)
          if (friendOpenid && authorOpenidsSet.has(friendOpenid)) friendOpenidSet.add(friendOpenid)
        })
      }
    }
    const ownStorySessionIds = new Set()
    if (userOpenid && posts.length > 0) {
      const sessionIds = posts.map(p => p.sessionId).filter(Boolean)
      const storyFavs = await prisma.storyFavorite.findMany({ where: { openid: userOpenid, sessionId: { in: sessionIds } }, select: { sessionId: true } })
      storyFavs.forEach(sf => ownStorySessionIds.add(sf.sessionId))
    }
    const isOwnPost = (post) => post.openid === userOpenid
    const items = posts.map(post => ({
      id: post.id, sessionId: post.sessionId, openid: post.openid, storyTitle: post.storyTitle,
      storySnippet: post.storySnippet, storyFull: post.storyFull, dreamFragment: post.session?.dreamFragment,
      isAnonymous: post.isAnonymous, isOwnStory: isOwnPost(post),
      nickname: isOwnPost(post) ? '我的故事' : (post.isAnonymous ? '匿名用户' : post.nickname),
      avatar: post.isAnonymous ? null : post.avatar, likeCount: post.likeCount, commentCount: post.commentCount,
      isFeatured: post.isFeatured, createdAt: post.createdAt,
      hasLiked: userOpenid ? post.likes.some(l => l.openid === userOpenid) : false,
      isFavorite: userOpenid ? post.favorites.some(f => f.openid === userOpenid) : false,
      isFriend: userOpenid ? friendOpenidSet.has(post.openid) : false
    }))
    return { posts: items, pagination: { page: parseInt(page), limit: parseInt(limit), total, hasMore: skip + items.length < total } }
  },

  async createWallPost({ openid, sessionId, isAnonymous = true, visibility = 'public', userId }) {
    if (!openid || !sessionId) {
      throw { status: 400, code: 'MISSING_PARAMS', message: '缺少必要参数' }
    }

    const tokenUser = await authService.getUser(userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      throw { status: 403, code: 'FORBIDDEN', message: '无权操作' }
    }

    const story = await prisma.story.findUnique({
      where: { sessionId },
      include: { session: true }
    })

    if (!story) {
      throw { status: 404, code: 'NOT_FOUND', message: '故事不存在' }
    }

    if (story.session.openid !== openid) {
      throw { status: 403, code: 'FORBIDDEN', message: '无权操作' }
    }

    const existing = await prisma.dreamWall.findUnique({ where: { sessionId } })
    if (existing) {
      throw { status: 409, code: 'ALREADY_PUBLISHED', message: '该故事已在梦墙发布' }
    }

    const contentToCheck = story.title + ' ' + story.content
    const safety = await checkContentSafety(contentToCheck)

    let status
    let rejectReason = null

    if (safety.verdict === 'blocked') {
      status = 'rejected'
      rejectReason = safety.reason || '内容包含违规信息'
    } else if (safety.verdict === 'review') {
      status = 'pending'
    } else {
      status = 'approved'
    }

    const user = await prisma.user.findUnique({ where: { openid } })

    const post = await prisma.dreamWall.create({
      data: {
        sessionId, openid,
        nickname: user?.nickname || '匿名用户',
        avatar: user?.avatar,
        storyTitle: story.title,
        storySnippet: story.content.slice(0, 200) + (story.content.length > 200 ? '...' : ''),
        storyFull: story.content,
        isAnonymous, visibility, status, likeCount: 0, commentCount: 0
      }
    })

    if (status === 'rejected') {
      await createNotification(prisma, {
        openid, type: 'POST_REJECTED', fromOpenid: 'system', fromNickname: '系统',
        targetId: post.id, targetTitle: story.title,
        message: `您的帖子「${story.title}」因【${rejectReason}】已被撤回`
      }).catch(() => {})

      return { success: false, reason: '内容审核未通过：' + rejectReason }
    } else if (status === 'pending') {
      return { post: { id: post.id }, message: '内容待审核，审核通过后将显示在梦墙', status: 'pending' }
    } else {
      return { post: { id: post.id }, message: '发布成功', status: 'approved' }
    }
  },

  async getHighlights() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const highlights = await prisma.dailyHighlight.findMany({
      where: { createdAt: { gte: today } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, wallId: true, createdAt: true }
    })

    const wallIds = highlights.map(h => h.wallId).filter(Boolean)

    if (wallIds.length === 0) {
      return { highlights: [], count: 0 }
    }

    const posts = await prisma.dreamWall.findMany({
      where: { id: { in: wallIds } },
      select: {
        id: true, sessionId: true, openid: true, nickname: true, avatar: true,
        storyTitle: true, storySnippet: true, likeCount: true, commentCount: true,
        createdAt: true, likes: { select: { openid: true } },
        favorites: { select: { openid: true } }, session: { select: { dreamFragment: true } }
      }
    })

    const orderedPosts = wallIds.map(id => posts.find(p => p.id === id)).filter(Boolean)
    return { highlights: orderedPosts, count: orderedPosts.length }
  },

  async getFriendsFeed({ userId, page = '1', limit = '20' }) {
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const tokenUser = await authService.getUser(userId)
    if (!tokenUser) {
      throw { status: 401, code: 'USER_NOT_FOUND', message: '用户未找到' }
    }

    const friends = await prisma.friend.findMany({
      where: { userId: tokenUser.id, status: 'ACCEPTED' },
      select: { friendId: true }
    })

    const friendInternalIds = friends.map(f => f.friendId)

    if (friendInternalIds.length === 0) {
      return { posts: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, hasMore: false } }
    }

    const friendUsers = await prisma.user.findMany({
      where: { id: { in: friendInternalIds } },
      select: { openid: true }
    })
    const friendOpenids = friendUsers.map(u => u.openid)

    const [posts, total] = await Promise.all([
      prisma.dreamWall.findMany({
        where: { openid: { in: friendOpenids }, status: 'approved', visibility: 'public' },
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(limit),
        include: { likes: { select: { openid: true } }, favorites: { select: { openid: true } }, _count: { select: { comments: true } } }
      }),
      prisma.dreamWall.count({
        where: { openid: { in: friendOpenids }, status: 'approved', visibility: 'public' }
      })
    ])

    const items = posts.map(post => ({
      id: post.id, sessionId: post.sessionId, openid: post.openid, storyTitle: post.storyTitle,
      storySnippet: post.storySnippet, storyFull: post.storyFull, isAnonymous: post.isAnonymous,
      nickname: post.isAnonymous ? '匿名用户' : post.nickname,
      avatar: post.isAnonymous ? null : post.avatar, likeCount: post.likeCount, commentCount: post.commentCount,
      isFeatured: post.isFeatured, createdAt: post.createdAt,
      hasLiked: post.likes.some(l => l.openid === tokenUser.openid),
      isFavorite: post.favorites.some(f => f.openid === tokenUser.openid)
    }))

    return { posts: items, pagination: { page: parseInt(page), limit: parseInt(limit), total, hasMore: skip + items.length < total } }
  },

  async getMyPosts({ userOpenid }) {
    const posts = await prisma.dreamWall.findMany({
      where: { openid: userOpenid },
      orderBy: { createdAt: 'desc' }
    })

    return {
      posts: posts.map(p => ({
        id: p.id, sessionId: p.sessionId, storyTitle: p.storyTitle, storySnippet: p.storySnippet,
        storyFull: p.storyFull, isAnonymous: p.isAnonymous, isOwnStory: true, nickname: '我的故事',
        likeCount: p.likeCount, commentCount: p.commentCount, status: p.status,
        isFeatured: p.isFeatured, createdAt: p.createdAt
      }))
    }
  },

  async toggleLike({ postId, openid, userId }) {
    if (!openid) {
      throw { status: 400, code: 'MISSING_PARAMS', message: '缺少 openid' }
    }

    const tokenUser = await authService.getUser(userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      throw { status: 403, code: 'FORBIDDEN', message: '无权操作' }
    }

    const post = await prisma.dreamWall.findUnique({ where: { id: postId } })

    if (!post) {
      throw { status: 404, code: 'NOT_FOUND', message: '帖子不存在' }
    }

    const existingLike = await prisma.dreamWallLike.findUnique({
      where: { wallId_openid: { wallId: postId, openid } }
    })

    if (existingLike) {
      await prisma.$transaction([
        prisma.dreamWallLike.delete({ where: { id: existingLike.id } }),
        prisma.dreamWall.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } })
      ])
      return { liked: false }
    } else {
      await prisma.$transaction([
        prisma.dreamWallLike.create({ data: { wallId: postId, openid } }),
        prisma.dreamWall.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } })
      ])

      const liker = await prisma.user.findUnique({ where: { openid }, select: { nickname: true } })
      createNotification(prisma, {
        openid: post.openid, type: 'LIKE', fromOpenid: openid,
        fromNickname: liker?.nickname || '匿名用户', targetId: post.sessionId,
        targetTitle: post.storyTitle,
        message: (liker?.nickname || '匿名用户') + ' 点赞了你的故事《' + post.storyTitle + '》'
      }).catch(() => {})

      return { liked: true }
    }
  },

  async getComments({ postId }) {
    const wallPost = await prisma.dreamWall.findUnique({
      where: { id: postId }, select: { openid: true }
    })

    if (!wallPost) {
      throw { status: 404, code: 'NOT_FOUND', message: '帖子不存在' }
    }

    const comments = await prisma.dreamWallComment.findMany({
      where: { wallId: postId },
      orderBy: { createdAt: 'asc' },
      include: { replies: { orderBy: { createdAt: 'asc' } } }
    })

    const topLevelComments = comments
      .filter(c => !c.parentId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(c => ({
        id: c.id, content: c.content, isAnonymous: c.isAnonymous,
        nickname: c.isAnonymous ? '匿名用户' : c.nickname,
        avatar: c.isAnonymous ? null : c.avatar, isAuthor: c.openid === wallPost.openid,
        parentId: c.parentId, createdAt: c.createdAt,
        replies: c.replies.map(r => ({
          id: r.id, content: r.content, isAnonymous: r.isAnonymous,
          nickname: r.isAnonymous ? '匿名用户' : r.nickname,
          avatar: r.isAnonymous ? null : r.avatar, isAuthor: r.openid === wallPost.openid,
          parentId: r.parentId, createdAt: r.createdAt, replies: []
        }))
      }))

    return { comments: topLevelComments }
  },

  async addComment({ postId, openid, content, isAnonymous = true, parentId, userId }) {
    if (!openid || !content) {
      throw { status: 400, code: 'MISSING_PARAMS', message: '缺少必要参数' }
    }

    const tokenUser = await authService.getUser(userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      throw { status: 403, code: 'FORBIDDEN', message: '无权操作' }
    }

    if (content.length > 500) {
      throw { status: 400, code: 'INVALID_CONTENT', message: '评论字数不超过500' }
    }

    const post = await prisma.dreamWall.findUnique({ where: { id: postId } })

    if (!post) {
      throw { status: 404, code: 'NOT_FOUND', message: '帖子不存在' }
    }

    if (parentId) {
      const parentComment = await prisma.dreamWallComment.findUnique({ where: { id: parentId } })

      if (!parentComment) {
        throw { status: 404, code: 'NOT_FOUND', message: '父评论不存在' }
      }

      if (parentComment.wallId !== postId) {
        throw { status: 400, code: 'INVALID_PARENT', message: '父评论不属于该帖子' }
      }

      if (parentComment.parentId !== null) {
        throw { status: 400, code: 'INVALID_NESTING', message: '不能回复二级评论' }
      }
    }

    const safety = await checkContentSafety(content)
    if (safety.verdict !== 'safe') {
      throw { status: 400, code: 'VALIDATION_ERROR', message: safety.reason || '内容包含敏感信息' }
    }

    const user = await prisma.user.findUnique({ where: { openid } })

    const [comment] = await prisma.$transaction([
      prisma.dreamWallComment.create({
        data: { wallId: postId, openid, nickname: user?.nickname || '匿名用户', avatar: user?.avatar, content, isAnonymous, parentId: parentId || null }
      }),
      prisma.dreamWall.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } })
    ])

    createNotification(prisma, {
      openid: post.openid, type: 'COMMENT', fromOpenid: openid,
      fromNickname: user?.nickname || '匿名用户', targetId: post.sessionId, targetTitle: post.storyTitle,
      message: (user?.nickname || '匿名用户') + ' 评论了你的故事'
    }).catch(() => {})

    return {
      comment: {
        id: comment.id, content: comment.content, isAnonymous: comment.isAnonymous,
        nickname: comment.isAnonymous ? '匿名用户' : comment.nickname,
        avatar: comment.isAnonymous ? null : comment.avatar, parentId: comment.parentId,
        createdAt: comment.createdAt, replies: []
      }
    }
  },

  async toggleFavorite({ postId, openid, userId }) {
    if (!openid) {
      throw { status: 400, code: 'MISSING_PARAMS', message: '缺少 openid' }
    }

    const tokenUser = await authService.getUser(userId)
    if (!tokenUser || tokenUser.openid !== openid) {
      throw { status: 403, code: 'FORBIDDEN', message: '无权操作' }
    }

    const post = await prisma.dreamWall.findUnique({ where: { id: postId } })

    if (!post) {
      throw { status: 404, code: 'NOT_FOUND', message: '帖子不存在' }
    }

    const existingFavorite = await prisma.dreamWallFavorite.findUnique({
      where: { wallId_openid: { wallId: postId, openid } }
    })

    if (existingFavorite) {
      await prisma.dreamWallFavorite.delete({ where: { id: existingFavorite.id } })
      return { favorited: false }
    } else {
      await prisma.dreamWallFavorite.create({ data: { wallId: postId, openid } })
      return { favorited: true }
    }
  },

  async getFavorites({ userId, page = '1', limit = '20' }) {
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const tokenUser = await authService.getUser(userId)
    if (!tokenUser) {
      throw { status: 401, code: 'USER_NOT_FOUND', message: '用户未找到' }
    }

    const [favorites, total] = await Promise.all([
      prisma.dreamWallFavorite.findMany({
        where: { openid: tokenUser.openid },
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(limit),
        include: { wall: { include: { likes: { select: { openid: true } } } } }
      }),
      prisma.dreamWallFavorite.count({ where: { openid: tokenUser.openid } })
    ])

    const posts = favorites
      .filter(f => f.wall.status === 'approved')
      .map(f => ({
        id: f.wall.id, sessionId: f.wall.sessionId, openid: f.wall.openid,
        storyTitle: f.wall.storyTitle, storySnippet: f.wall.storySnippet, storyFull: f.wall.storyFull,
        isAnonymous: f.wall.isAnonymous, nickname: f.wall.isAnonymous ? '匿名用户' : f.wall.nickname,
        avatar: f.wall.isAnonymous ? null : f.wall.avatar, likeCount: f.wall.likeCount,
        commentCount: f.wall.commentCount, isFeatured: f.wall.isFeatured, createdAt: f.wall.createdAt,
        hasLiked: f.wall.likes.some(l => l.openid === tokenUser.openid), isFavorite: true
      }))

    return { posts, pagination: { page: parseInt(page), limit: parseInt(limit), total, hasMore: skip + posts.length < total } }
  },

  async toggleStoryFavorite({ sessionId, userId }) {
    const tokenUser = await authService.getUser(userId)
    if (!tokenUser) {
      throw { status: 401, code: 'USER_NOT_FOUND', message: '用户未找到' }
    }

    const existing = await prisma.storyFavorite.findUnique({
      where: { sessionId_openid: { sessionId, openid: tokenUser.openid } }
    })

    if (existing) {
      await prisma.storyFavorite.delete({ where: { id: existing.id } })
      return { favorited: false }
    } else {
      await prisma.storyFavorite.create({ data: { sessionId, openid: tokenUser.openid } })
      return { favorited: true }
    }
  },

  async deletePost({ postId, userId }) {
    const tokenUser = await authService.getUser(userId)
    if (!tokenUser) {
      throw { status: 401, code: 'USER_NOT_FOUND', message: '用户未找到' }
    }

    const post = await prisma.dreamWall.findUnique({ where: { id: postId } })

    if (!post) {
      throw { status: 404, code: 'NOT_FOUND', message: '帖子不存在' }
    }

    if (post.openid !== tokenUser.openid) {
      throw { status: 403, code: 'FORBIDDEN', message: '无权删除他人的帖子' }
    }

    await prisma.dreamWall.delete({ where: { id: postId } })
    return { message: '删除成功' }
  },

  async getStoryFavorites({ userId }) {
    const tokenUser = await authService.getUser(userId)
    if (!tokenUser) {
      throw { status: 401, code: 'USER_NOT_FOUND', message: '用户未找到' }
    }

    const favorites = await prisma.storyFavorite.findMany({
      where: { openid: tokenUser.openid },
      orderBy: { createdAt: 'desc' },
      include: { session: { include: { story: { select: { title: true, content: true } } } } }
    })

    const stories = favorites
      .filter(f => f.session?.story)
      .map(f => ({
        sessionId: f.sessionId, storyTitle: f.session.story.title, story: f.session.story.content,
        createdAt: f.createdAt.toISOString(),
        date: f.session.completedAt?.toISOString() || f.session.updatedAt.toISOString()
      }))

    return { stories }
  }
}