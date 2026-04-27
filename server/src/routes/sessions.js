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
    const { content } = req.body

    await sessionService.submitDream(sessionId, content)
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
        answers.map(a => ({ question: a.questionText, answer: a.answerText }))
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

  // POST /api/sessions/:sessionId/interpret - 生成梦境解读
  fastify.post('/sessions/:sessionId/interpret', async (req, res) => {
    const { sessionId } = req.params
    const { openid } = req.body

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
    const user = await prisma.user.findUnique({ where: { openid } })
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
      where: { openid },
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
    const { guestOpenid, userOpenid } = req.body

    if (!guestOpenid || !userOpenid) {
      return res.status(400).send({ success: false, reason: '缺少参数' })
    }

    // Verify the token user matches the userOpenid
    const tokenUser = await authService.getUser(req.userId)
    if (!tokenUser || tokenUser.openid !== userOpenid) {
      return res.status(403).send({ success: false, reason: '无权操作' })
    }

    // 查找该游客的所有session
    const sessions = await prisma.session.findMany({
      where: { openid: guestOpenid }
    })

    if (sessions.length === 0) {
      return { success: true, migrated: 0 }
    }

    // 迁移所有session到新用户
    await prisma.session.updateMany({
      where: { openid: guestOpenid },
      data: { openid: userOpenid }
    })

    return {
      success: true,
      migrated: sessions.length,
      sessionIds: sessions.map(s => s.id)
    }
  })
}
