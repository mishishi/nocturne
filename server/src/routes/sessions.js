import { sessionService } from '../services/sessionService.js'
import { questionService } from '../services/questionService.js'
import { storyService } from '../services/storyService.js'
import { prisma } from '../config/database.js'

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

    const questionIndex = session.currentQuestionIndex
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
    return {
      success: true,
      nextQuestion: updatedSession.questions[updatedSession.currentQuestionIndex],
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
    const sessions = await sessionService.getUserHistory(openid)
    return { sessions }
  })
}
