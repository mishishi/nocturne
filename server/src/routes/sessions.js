import { sessionService } from '../services/sessionService.js'
import { questionService } from '../services/questionService.js'
import { storyService } from '../services/storyService.js'
import { prisma } from '../config/database.js'
import { authService } from '../services/authService.js'
import { authMiddleware } from '../middleware/auth.js'
import { successResponse, errorResponse } from '../config/response.js'

export default async function sessionRoutes(fastify) {
  // POST /api/sessions - 创建会话
  fastify.post('/sessions', async (req, res) => {
    const { openid } = req.body
    if (!openid) return res.status(400).send(errorResponse('openid required', 'MISSING_PARAMS'))

    const session = await sessionService.createSession(openid)
    return res.send(successResponse({ sessionId: session.id, status: session.status }))
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

    return res.send(successResponse({ questions, questionIndex: 0 }))
  })

  // POST /api/sessions/:sessionId/answer - 提交回答
  fastify.post('/sessions/:sessionId/answer', async (req, res) => {
    const { sessionId } = req.params
    const { answer } = req.body

    const session = await sessionService.getSession(sessionId)
    if (!session) return res.status(404).send(errorResponse('Session not found', 'NOT_FOUND'))

    // Validate question index and questions array
    const questionIndex = session.currentQuestionIndex
    if (!session.questions || !session.questions[questionIndex]) {
      return res.status(400).send(errorResponse('无效的问题索引', 'INVALID_INDEX'))
    }

    const questionText = session.questions[questionIndex]
    const { isLastQuestion } = await sessionService.saveAnswer(sessionId, questionIndex, questionText, answer)

    // 即使是最后一个问题，也返回nextIndex让前端通过SSE生成故事
    const updatedSession = await sessionService.getSession(sessionId)
    return res.send(successResponse({
      nextQuestion: null,
      nextIndex: updatedSession.currentQuestionIndex,
      isLastQuestion: isLastQuestion
    }))
  })

  // GET /api/sessions/:sessionId/story - 获取故事
  fastify.get('/sessions/:sessionId/story', async (req, res) => {
    const { sessionId } = req.params
    const story = await prisma.story.findUnique({ where: { sessionId } })
    if (!story) return res.status(404).send(errorResponse('Story not found', 'NOT_FOUND'))
    return res.send(successResponse({ story }))
  })

  // GET /api/sessions/:sessionId/story/stream - SSE流式生成故事
  fastify.get('/sessions/:sessionId/story/stream', async (req, res) => {
    const { sessionId } = req.params

    // Verify auth token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).send({ error: '未授权，请先登录' })
    }
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const tokenUser = await authService.verifyToken(token)
    if (!tokenUser) {
      return res.status(401).send({ error: '登录已过期，请重新登录' })
    }

    const session = await sessionService.getSession(sessionId)
    if (!session) {
      return res.status(404).send(errorResponse('Session not found', 'NOT_FOUND'))
    }

    // Verify session belongs to the authenticated user
    if (session.openid !== tokenUser.openid) {
      return res.status(403).send({ error: '无权访问此会话' })
    }

    // Check if story already exists
    const existingStory = await prisma.story.findUnique({ where: { sessionId } })
    if (existingStory) {
      return res.send(successResponse({ story: { title: existingStory.title, content: existingStory.content } }))
    }

    // Get answers
    const answers = await prisma.answer.findMany({
      where: { sessionId },
      orderBy: { questionIndex: 'asc' }
    })

    // Set SSE headers with CORS support
    res.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    })

    try {
      // Stream story generation
      for await (const event of storyService.generateStoryStream(
        session.dreamFragment,
        answers.map(a => ({ question: a.questionText, answer: a.answerText })),
        session.styleTag
      )) {
        if (event.type === 'start') {
          res.raw.write(`event: start\ndata: ${JSON.stringify({ title: event.title })}\n\n`)
        } else if (event.type === 'chunk') {
          res.raw.write(`event: chunk\ndata: ${JSON.stringify({ content: event.content })}\n\n`)
        } else if (event.type === 'done') {
          // Save story to DB
          const { title, content } = event
          await sessionService.saveStory(sessionId, title, content, { prompt: 0, completion: 0 })
          res.raw.write(`event: done\ndata: ${JSON.stringify({ title, content })}\n\n`)
        }
      }
    } catch (error) {
      res.raw.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`)
    } finally {
      res.raw.end()
    }
  })

  // GET /api/sessions/users/:openid/history - 获取历史
  fastify.get('/sessions/users/:openid/history', async (req, res) => {
    const { openid } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const result = await sessionService.getUserHistory(openid, page, limit)
    return res.send(result)
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
    if (!session) return res.status(404).send(errorResponse('Session not found', 'NOT_FOUND'))

    const story = await prisma.story.findUnique({ where: { sessionId } })
    if (!story) return res.status(404).send(errorResponse('Story not found', 'NOT_FOUND'))

    // Check if interpretation already exists
    if (story.interpretation) {
      return res.send(successResponse({ interpretation: story.interpretation, alreadyExists: true }))
    }

    // Check user points (interpretation costs 10 points)
    const user = await prisma.user.findUnique({ where: { openid: tokenUser.openid } })
    if (!user) return res.status(404).send(errorResponse('User not found', 'NOT_FOUND'))

    const COST = 10
    if (user.points < COST) {
      return res.send(errorResponse(`解读需要 ${COST} 积分，你的积分不足`, 'INSUFFICIENT_POINTS'))
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

    return res.send(successResponse({
      interpretation,
      pointsUsed: COST,
      remainingPoints: user.points - COST
    }))
  })

  // GET /api/sessions/:sessionId/interpretation - 获取已有解读
  fastify.get('/sessions/:sessionId/interpretation', async (req, res) => {
    const { sessionId } = req.params
    const story = await prisma.story.findUnique({ where: { sessionId } })
    if (!story) return res.status(404).send(errorResponse('Story not found', 'NOT_FOUND'))
    return res.send(successResponse({ interpretation: story.interpretation || null }))
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

    return res.send(successResponse(result))
  })
}
