import { sessionService } from '../services/sessionService.js'
import { questionService } from '../services/questionService.js'
import { storyService } from '../services/storyService.js'
import { prisma } from '../config/database.js'
import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'

export default async function sessionRoutes(fastify) {
  // POST /api/sessions - 创建会话
  fastify.post('/sessions', async (req, res) => {
    const { openid } = req.body
    if (!openid) return res.status(400).send({ error: 'openid required' })

    const session = await sessionService.createSession(openid)
    return { sessionId: session.id, status: session.status }
  })

  // POST /api/sessions/:sessionId/dream - 提交梦境
  fastify.post('/sessions/:sessionId/dream', async (req, res) => {
    const { sessionId } = req.params
    const { content, styleTag } = req.body

    await sessionService.submitDream(sessionId, content, styleTag)
    const questions = await questionService.generateQuestions(content)

    // 保存问题到会话
    await prisma.session.update({
      where: { id: sessionId },
      data: { questions }
    })

    return { success: true, questions, questionIndex: 0 }
  })

  // POST /api/sessions/:sessionId/answer - 提交回答
  fastify.post('/sessions/:sessionId/answer', async (req, res) => {
    const { sessionId } = req.params
    const { answer } = req.body

    const session = await sessionService.getSession(sessionId)
    if (!session) return res.status(404).send({ error: 'Session not found' })

    // Validate question index and questions array
    const questionIndex = session.currentQuestionIndex
    if (!session.questions || !session.questions[questionIndex]) {
      return res.status(400).send({ error: '无效的问题索引' })
    }

    const questionText = session.questions[questionIndex]
    const { isLastQuestion } = await sessionService.saveAnswer(sessionId, questionIndex, questionText, answer)

    if (isLastQuestion) {
      const answers = await prisma.answer.findMany({
        where: { sessionId },
        orderBy: { questionIndex: 'asc' }
      })

      const { title, content, tokens } = await storyService.generateStory(
        session.dreamFragment,
        answers.map(a => ({ question: a.questionText, answer: a.answerText })),
        session.styleTag
      )

      await sessionService.saveStory(sessionId, title, content, tokens)
      return { success: true, story: { title, content } }
    }

    const updatedSession = await sessionService.getSession(sessionId)
    const nextQuestion = updatedSession.questions?.[updatedSession.currentQuestionIndex]
    return {
      success: true,
      nextQuestion: nextQuestion || null,
      nextIndex: updatedSession.currentQuestionIndex
    }
  })

  // GET /api/sessions/:sessionId/story - 获取故事
  fastify.get('/sessions/:sessionId/story', async (req, res) => {
    const { sessionId } = req.params
    const story = await prisma.story.findUnique({ where: { sessionId } })
    if (!story) return res.status(404).send({ error: 'Story not found' })
    return { story }
  })

  // GET /api/sessions/users/:openid/history - 获取历史
  fastify.get('/sessions/users/:openid/history', async (req, res) => {
    const { openid } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const result = await sessionService.getUserHistory(openid, page, limit)
    return result
  })

  // POST /api/sessions/:sessionId/interpret - 生成梦境解读 (需登录)
  fastify.post('/sessions/:sessionId/interpret', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { sessionId } = req.params

    // Get authenticated user from token
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send({ success: false, reason: '用户未找到' })
    }

    // Get session with story and answers
    const session = await sessionService.getSession(sessionId)
    if (!session) return res.status(404).send({ error: 'Session not found' })

    const story = await prisma.story.findUnique({ where: { sessionId } })
    if (!story) return res.status(404).send({ error: 'Story not found' })

    // Check if interpretation already exists
    if (story.interpretation) {
      return { success: true, interpretation: story.interpretation, alreadyExists: true }
    }

    // Check user points (interpretation costs 10 points)
    const user = await prisma.user.findUnique({ where: { openid: tokenUser.openid } })
    if (!user) return res.status(404).send({ error: 'User not found' })

    const COST = 10
    if (user.points < COST) {
      return { success: false, reason: `解读需要 ${COST} 积分，你的积分不足` }
    }

    // Get answers for context
    const answers = await prisma.answer.findMany({
      where: { sessionId },
      orderBy: { questionIndex: 'asc' }
    })

    // Generate interpretation
    const { interpretation, tokens } = await storyService.generateInterpretation(
      story.title,
      story.content,
      session.dreamFragment,
      answers.map(a => ({ question: a.questionText, answer: a.answerText }))
    )

    // Deduct points and save interpretation
    await prisma.user.update({
      where: { openid: tokenUser.openid },
      data: { points: { decrement: COST } }
    })

    await prisma.story.update({
      where: { sessionId },
      data: {
        interpretation,
        promptTokens: story.promptTokens + (tokens.prompt || 0),
        completionTokens: story.completionTokens + (tokens.completion || 0)
      }
    })

    return {
      success: true,
      interpretation,
      pointsUsed: COST,
      remainingPoints: user.points - COST
    }
  })

  // GET /api/sessions/:sessionId/interpretation - 获取已有解读
  fastify.get('/sessions/:sessionId/interpretation', async (req, res) => {
    const { sessionId } = req.params
    const story = await prisma.story.findUnique({ where: { sessionId } })
    if (!story) return res.status(404).send({ error: 'Story not found' })
    return { interpretation: story.interpretation || null }
  })

  // POST /api/sessions/migrate - 迁移游客session到登录用户
  fastify.post('/sessions/migrate', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    const { guestOpenid } = req.body

    if (!guestOpenid) {
      return res.status(400).send({ success: false, reason: '缺少 guestOpenid 参数' })
    }

    // Get authenticated user from token
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser) {
      return res.status(401).send({ success: false, reason: '用户未找到' })
    }

    // The token user's openid is the destination (userOpenid)
    // guestOpenid is the source - only allow migrating if the token user is the owner
    // or if guestOpenid doesn't have a registered user account
    const guestUser = await prisma.user.findUnique({
      where: { openid: guestOpenid }
    })

    // If guestOpenid belongs to a registered user, the token user must be that user
    if (guestUser && guestUser.openid !== tokenUser.openid) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    // If guestOpenid doesn't exist as a user, allow migration
    // (this is a true guest session with no account)

    // 迁移所有session到新用户（使用事务确保原子性）
    const result = await prisma.$transaction(async (tx) => {
      const sessions = await tx.session.findMany({
        where: { openid: guestOpenid }
      })

      if (sessions.length === 0) {
        return { migrated: 0, sessionIds: [] }
      }

      await tx.session.updateMany({
        where: { openid: guestOpenid },
        data: { openid: tokenUser.openid }
      })

      return { migrated: sessions.length, sessionIds: sessions.map(s => s.id) }
    })

    return { success: true, ...result }
  })
}
