import { prisma } from '../config/database.js'

export const sessionService = {
  async createSession(openid) {
    // 确保用户存在
    await prisma.user.upsert({
      where: { openid },
      create: { openid },
      update: {}
    })

    // 检查是否有活跃会话
    const activeSession = await prisma.session.findFirst({
      where: { openid, status: { not: 'COMPLETED' } }
    })
    if (activeSession) return activeSession

    return prisma.session.create({
      data: { openid }
    })
  },

  async getSession(sessionId) {
    return prisma.session.findUnique({ where: { id: sessionId } })
  },

  async submitDream(sessionId, dreamText, styleTag) {
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        dreamFragment: dreamText,
        styleTag: styleTag || '',
        status: 'Q1',
        questions: [],
        currentQuestionIndex: 0
      }
    })

    await prisma.message.create({
      data: {
        sessionId,
        role: 'user',
        content: dreamText,
        msgType: 'text'
      }
    })

    return session
  },

  async saveAnswer(sessionId, questionIndex, questionText, answerText) {
    await prisma.answer.create({
      data: { sessionId, questionIndex, questionText, answerText }
    })

    await prisma.message.create({
      data: {
        sessionId,
        role: 'user',
        content: answerText,
        msgType: 'text'
      }
    })

    const isLastQuestion = questionIndex >= 4
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: isLastQuestion ? 'COLLECTING' : `Q${questionIndex + 2}`,
        currentQuestionIndex: questionIndex + 1
      }
    })

    return { isLastQuestion }
  },

  async saveStory(sessionId, title, content, tokens = {}) {
    const wordCount = content.replace(/\s/g, '').length

    await prisma.story.create({
      data: {
        sessionId,
        title,
        content,
        wordCount,
        promptTokens: tokens.prompt || 0,
        completionTokens: tokens.completion || 0
      }
    })

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    const session = await prisma.session.findUnique({ where: { id: sessionId } })
    await prisma.user.update({
      where: { openid: session.openid },
      data: { totalDreams: { increment: 1 } }
    })

    return { sessionId, title, content }
  },

  async getUserHistory(openid, page = 1, limit = 20) {
    const skip = (page - 1) * limit

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: { openid, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
        include: { story: true }
      }),
      prisma.session.count({
        where: { openid, status: 'COMPLETED' }
      })
    ])

    return {
      sessions: sessions.map(s => ({
        id: s.id,
        sessionId: s.id,
        openid: s.openid,
        date: s.completedAt?.toISOString() || s.updatedAt.toISOString(),
        dreamFragment: s.dreamFragment,
        storyTitle: s.story?.title || '',
        story: s.story?.content || ''
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + sessions.length < total
      }
    }
  }
}
