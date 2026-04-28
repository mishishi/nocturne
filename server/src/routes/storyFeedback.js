import { prisma } from '../config/database.js'
import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'

export default async function storyFeedbackRoutes(fastify) {
  // POST /api/story-feedback - 提交故事反馈 (需登录)
  fastify.post('/story-feedback', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { sessionId, openid, overallRating, elementRatings, comment } = req.body

    // Get authenticated user
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send({ success: false, reason: '用户未找到' })
    }

    // If openid is provided, verify it matches the authenticated user
    if (openid && openid !== tokenUser.openid) {
      return res.status(403).send({ success: false, reason: '无权为他人提交反馈' })
    }

    // Validate required fields
    if (!sessionId) {
      return res.status(400).send({ success: false, reason: '缺少 sessionId' })
    }

    if (!overallRating) {
      return res.status(400).send({ success: false, reason: '缺少 overallRating' })
    }

    // Validate overallRating range (1-5)
    if (typeof overallRating !== 'number' || overallRating < 1 || overallRating > 5) {
      return res.status(400).send({ success: false, reason: 'overallRating 必须在 1-5 之间' })
    }

    // Validate comment length (max 200 chars)
    if (comment && comment.length > 200) {
      return res.status(400).send({ success: false, reason: '评论字数不超过 200' })
    }

    // Validate elementRatings if provided
    if (elementRatings) {
      const validRatings = ['character', 'location', 'object', 'emotion', 'plot']
      for (const key of Object.keys(elementRatings)) {
        if (!validRatings.includes(key)) {
          return res.status(400).send({ success: false, reason: `无效的 elementRatings 字段: ${key}` })
        }
        const val = elementRatings[key]
        if (typeof val !== 'number' || val < 1 || val > 5) {
          return res.status(400).send({ success: false, reason: `elementRatings.${key} 必须在 1-5 之间` })
        }
      }
    }

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return res.status(404).send({ success: false, reason: 'Session not found' })
    }

    // Check if already submitted
    const existingFeedback = await prisma.storyFeedback.findUnique({
      where: { sessionId }
    })

    if (existingFeedback) {
      return res.status(409).send({ success: false, reason: '该故事已提交过反馈' })
    }

    // Use authenticated user's openid (already verified above)
    const feedbackOpenid = tokenUser.openid

    // Create feedback
    const feedback = await prisma.storyFeedback.create({
      data: {
        sessionId,
        openid: feedbackOpenid,
        overallRating,
        characterRating: elementRatings?.character,
        locationRating: elementRatings?.location,
        objectRating: elementRatings?.object,
        emotionRating: elementRatings?.emotion,
        plotRating: elementRatings?.plot,
        comment: comment || null
      }
    })

    return {
      success: true,
      feedback: {
        id: feedback.id,
        sessionId: feedback.sessionId,
        overallRating: feedback.overallRating,
        createdAt: feedback.createdAt
      }
    }
  })

  // GET /api/story-feedback/:sessionId - 获取反馈
  fastify.get('/story-feedback/:sessionId', async (req, res) => {
    const { sessionId } = req.params

    const feedback = await prisma.storyFeedback.findUnique({
      where: { sessionId }
    })

    if (!feedback) {
      return res.status(404).send({ success: false, reason: '反馈不存在' })
    }

    return {
      success: true,
      feedback: {
        id: feedback.id,
        sessionId: feedback.sessionId,
        openid: feedback.openid,
        overallRating: feedback.overallRating,
        elementRatings: {
          character: feedback.characterRating,
          location: feedback.locationRating,
          object: feedback.objectRating,
          emotion: feedback.emotionRating,
          plot: feedback.plotRating
        },
        comment: feedback.comment,
        createdAt: feedback.createdAt
      }
    }
  })

  // GET /api/story-feedback/:sessionId/all - 获取该session的所有反馈
  fastify.get('/story-feedback/:sessionId/all', async (req, res) => {
    const { sessionId } = req.params

    try {
      const feedbacks = await prisma.storyFeedback.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      })

      // 计算统计数据
      const count = feedbacks.length
      if (count === 0) {
        return {
          success: true,
          feedbacks: [],
          stats: {
            count: 0,
            overallAvg: 0,
            elementAvgs: null
          }
        }
      }

      const overallSum = feedbacks.reduce((sum, f) => sum + f.overallRating, 0)
      const overallAvg = parseFloat((overallSum / count).toFixed(1))

      // 计算各维度平均
      const elementAvgs = {
        character: calculateAvg(feedbacks, 'characterRating'),
        location: calculateAvg(feedbacks, 'locationRating'),
        object: calculateAvg(feedbacks, 'objectRating'),
        emotion: calculateAvg(feedbacks, 'emotionRating'),
        plot: calculateAvg(feedbacks, 'plotRating')
      }

      return {
        success: true,
        feedbacks: feedbacks.map(f => ({
          id: f.id,
          overallRating: f.overallRating,
          elementRatings: {
            character: f.characterRating,
            location: f.locationRating,
            object: f.objectRating,
            emotion: f.emotionRating,
            plot: f.plotRating
          },
          comment: f.comment,
          createdAt: f.createdAt
        })),
        stats: {
          count,
          overallAvg,
          elementAvgs
        }
      }
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err)
      return res.status(500).send({ success: false, reason: '服务器错误' })
    }
  })

  // GET /api/story-feedback/analytics - AI质量分析 (需管理员)
  fastify.get('/story-feedback/analytics', async (req, res) => {
    try {
      const feedbacks = await prisma.storyFeedback.findMany({
        orderBy: { createdAt: 'desc' }
      })

      const count = feedbacks.length
      if (count === 0) {
        return {
          success: true,
          analytics: {
            totalFeedbacks: 0,
            overallAvg: 0,
            dimensionAvgs: {
              character: null,
              location: null,
              object: null,
              emotion: null,
              plot: null
            },
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            suggestions: ['暂无反馈数据']
          }
        }
      }

      // Overall average
      const overallSum = feedbacks.reduce((sum, f) => sum + f.overallRating, 0)
      const overallAvg = parseFloat((overallSum / count).toFixed(1))

      // Dimension averages
      const dimensionAvgs = {
        character: calculateAvg(feedbacks, 'characterRating'),
        location: calculateAvg(feedbacks, 'locationRating'),
        object: calculateAvg(feedbacks, 'objectRating'),
        emotion: calculateAvg(feedbacks, 'emotionRating'),
        plot: calculateAvg(feedbacks, 'plotRating')
      }

      // Rating distribution
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      feedbacks.forEach(f => {
        if (f.overallRating >= 1 && f.overallRating <= 5) {
          ratingDistribution[f.overallRating]++
        }
      })

      // Find weakest dimension
      const validDimensions = Object.entries(dimensionAvgs)
        .filter(([_, v]) => v !== null)
        .sort((a, b) => a[1] - b[1])

      const weakestDimension = validDimensions[0]?.[0] || null
      const weakestValue = validDimensions[0]?.[1] || null

      // Generate suggestions
      const suggestions = []
      if (overallAvg < 3.5) {
        suggestions.push('整体评分偏低，建议审视故事生成的整体质量')
      }
      if (weakestDimension && weakestValue < 3.5) {
        const dimNames = { character: '角色塑造', location: '场景描写', object: '物品细节', emotion: '情感表达', plot: '情节设计' }
        suggestions.push(`${dimNames[weakestDimension]}评分最低(${weakestValue}分)，建议加强该维度的prompt`)
      }
      if (ratingDistribution[1] + ratingDistribution[2] > count * 0.3) {
        suggestions.push('存在较多低分反馈(1-2分)，建议排查生成异常')
      }
      if (suggestions.length === 0) {
        suggestions.push('AI生成质量良好，继续保持当前prompt策略')
      }

      return {
        success: true,
        analytics: {
          totalFeedbacks: count,
          overallAvg,
          dimensionAvgs,
          ratingDistribution,
          weakestDimension,
          weakestValue,
          suggestions
        }
      }
    } catch (err) {
      console.error('Failed to generate analytics:', err)
      return res.status(500).send({ success: false, reason: '服务器错误' })
    }
  })

  // GET /api/story-feedback/recommendations - 个性化推荐 (需登录)
  fastify.get('/story-feedback/recommendations', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { openid } = req.query

    if (!openid) {
      return res.status(400).send({ success: false, reason: '缺少 openid' })
    }

    try {
      // Get user's historical feedbacks to build preference profile
      const userFeedbacks = await prisma.storyFeedback.findMany({
        where: { openid }
      })

      // Calculate user's dimension preferences
      const preference = { character: 0, location: 0, object: 0, emotion: 0, plot: 0 }
      let count = 0

      userFeedbacks.forEach(f => {
        if (f.characterRating) preference.character += f.characterRating
        if (f.locationRating) preference.location += f.locationRating
        if (f.objectRating) preference.object += f.objectRating
        if (f.emotionRating) preference.emotion += f.emotionRating
        if (f.plotRating) preference.plot += f.plotRating
        count++
      })

      if (count > 0) {
        Object.keys(preference).forEach(k => {
          preference[k] = preference[k] / count
        })
      }

      // If no feedback history, return popular stories
      if (count === 0) {
        const popularStories = await prisma.dreamWall.findMany({
          where: { status: 'approved', visibility: 'public' },
          orderBy: [
            { likeCount: 'desc' },
            { commentCount: 'desc' }
          ],
          take: 10,
          include: {
            likes: { take: 1, select: { openid: true } }
          }
        })

        return {
          success: true,
          recommendations: popularStories.map(p => ({
            id: p.id,
            sessionId: p.sessionId,
            storyTitle: p.storyTitle,
            storySnippet: p.storySnippet,
            nickname: p.isAnonymous ? '匿名用户' : p.nickname,
            likeCount: p.likeCount,
            commentCount: p.commentCount,
            createdAt: p.createdAt,
            score: p.likeCount + p.commentCount * 2,
            reason: '热门推荐'
          })),
          hasPreferences: false
        }
      }

      // Find stories with similar dimension strengths
      const allStories = await prisma.dreamWall.findMany({
        where: { status: 'approved', visibility: 'public' },
        include: {
          session: {
            include: {
              storyFeedback: true
            }
          },
          likes: { take: 1, select: { openid: true } }
        }
      })

      // Score each story based on preference match
      const scoredStories = allStories
        .map(story => {
          // Get average dimension ratings for this story
          const feedbacks = story.session?.storyFeedback || []
          if (feedbacks.length === 0) return null

          const storyDimAvg = {
            character: calculateAvg(feedbacks, 'characterRating'),
            location: calculateAvg(feedbacks, 'locationRating'),
            object: calculateAvg(feedbacks, 'objectRating'),
            emotion: calculateAvg(feedbacks, 'emotionRating'),
            plot: calculateAvg(feedbacks, 'plotRating')
          }

          // Calculate match score (cosine similarity)
          let dotProduct = 0
          let prefMagnitude = 0
          let storyMagnitude = 0

          Object.keys(preference).forEach(k => {
            const prefVal = preference[k as keyof typeof preference]
            const storyVal = storyDimAvg[k as keyof typeof storyDimAvg] || 0
            if (prefVal > 0 && storyVal > 0) {
              dotProduct += prefVal * storyVal
              prefMagnitude += prefVal * prefVal
              storyMagnitude += storyVal * storyVal
            }
          })

          const magnitude = Math.sqrt(prefMagnitude) * Math.sqrt(storyMagnitude)
          const similarity = magnitude > 0 ? dotProduct / magnitude : 0

          // Find strongest dimension of this story
          const storyDims = Object.entries(storyDimAvg)
            .filter(([_, v]) => v !== null)
            .sort((a, b) => (b[1] as number) - (a[1] as number))

          const topDim = storyDims[0]?.[0] || null
          const dimNames = { character: '角色塑造', location: '场景描写', object: '物品细节', emotion: '情感表达', plot: '情节设计' }

          return {
            id: story.id,
            sessionId: story.sessionId,
            storyTitle: story.storyTitle,
            storySnippet: story.storySnippet,
            nickname: story.isAnonymous ? '匿名用户' : story.nickname,
            likeCount: story.likeCount,
            commentCount: story.commentCount,
            createdAt: story.createdAt,
            score: similarity,
            reason: topDim ? `匹配你的${dimNames[topDim as keyof typeof dimNames]}偏好` : '猜你喜欢'
          }
        })
        .filter(s => s !== null && s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)

      return {
        success: true,
        recommendations: scoredStories,
        hasPreferences: true
      }
    } catch (err) {
      console.error('Failed to generate recommendations:', err)
      return res.status(500).send({ success: false, reason: '服务器错误' })
    }
  })
}

function calculateAvg(feedbacks, field) {
  const values = feedbacks.map(f => f[field]).filter(v => v !== null)
  if (values.length === 0) return null
  const sum = values.reduce((a, b) => a + b, 0)
  return parseFloat((sum / values.length).toFixed(1))
}
