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
}
