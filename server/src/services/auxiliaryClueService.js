const { prisma } = require('../utils/prisma')

/**
 * 辅助线索服务
 * 关联用户历史梦境数据，为解读提供个性化参考
 */
const auxiliaryClueService = {
  /**
   * 获取用户的历史线索摘要
   * @param {string} openid - 用户 openid
   * @param {string} currentSessionId - 当前 session ID（排除在外）
   * @returns {Object} { dreamPatterns, recurringElements, emotionalBaseline }
   */
  async getUserClues(openid, currentSessionId) {
    // 获取用户最近发布到梦墙的故事（已审核通过的）
    const wallPosts = await prisma.dreamWall.findMany({
      where: {
        openid,
        status: 'approved',
        visibility: 'public'
      },
      select: {
        storyTitle: true,
        storySnippet: true,
        storyFull: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // 获取用户最近的问答记录（排除当前 session）
    const recentAnswers = await prisma.answer.findMany({
      where: {
        session: {
          openid,
          id: { not: currentSessionId }
        }
      },
      select: {
        questionText: true,
        answerText: true
      },
      orderBy: { answeredAt: 'desc' },
      take: 10
    })

    // 提取梦境模式
    const dreamPatterns = this.extractDreamPatterns(wallPosts, recentAnswers)

    // 提取重复元素
    const recurringElements = this.extractRecurringElements(wallPosts, recentAnswers)

    // 情绪基线
    const emotionalBaseline = this.inferEmotionalBaseline(recentAnswers)

    return {
      dreamPatterns,
      recurringElements,
      emotionalBaseline,
      hasHistory: wallPosts.length > 0 || recentAnswers.length > 0
    }
  },

  /**
   * 从历史数据中提取梦境模式
   */
  extractDreamPatterns(wallPosts, recentAnswers) {
    if (wallPosts.length === 0 && recentAnswers.length === 0) {
      return null
    }

    const patterns = []

    // 从故事标题和片段中提取主题
    wallPosts.forEach(post => {
      const title = post.storyTitle || ''
      const snippet = post.storySnippet || ''

      // 检测常见主题
      if (/飞|翔|漂浮|天空/.test(snippet + title)) {
        patterns.push('飞翔与自由')
      }
      if (/水|海|湖|河|游泳|潜水/.test(snippet + title)) {
        patterns.push('水域探索')
      }
      if (/追逐|逃跑|追|逃/.test(snippet + title)) {
        patterns.push('追逐与逃避')
      }
      if (/朋友|家人|父母|同伴/.test(snippet + title)) {
        patterns.push('人际关系')
      }
      if (/死亡|离别|失去/.test(snippet + title)) {
        patterns.push('失去与离别')
      }
      if (/家|房子|房间|门/.test(snippet + title)) {
        patterns.push('家居与安全')
      }
    })

    // 去重
    const uniquePatterns = [...new Set(patterns)]

    return uniquePatterns.length > 0 ? uniquePatterns.slice(0, 3) : null
  },

  /**
   * 提取重复出现的梦境元素
   */
  extractRecurringElements(wallPosts, recentAnswers) {
    const elementCounts = {}

    // 从完整故事中统计元素
    wallPosts.forEach(post => {
      const text = (post.storyFull || '') + (post.storySnippet || '')

      // 检测动物
      const animals = text.match(/[狗|猫|鸟|鱼|蛇|马|牛|羊|猪|鼠|兔|龙|虎|象|猴]熊?|蝴蝶|蜜蜂|蚂蚁/g)
      if (animals) {
        animals.forEach(a => {
          elementCounts[a] = (elementCounts[a] || 0) + 1
        })
      }

      // 检测场景
      const scenes = text.match(/森林|城市|乡村|海边|山上|家中|学校|公司|医院/g)
      if (scenes) {
        scenes.forEach(s => {
          elementCounts[s] = (elementCounts[s] || 0) + 1
        })
      }

      // 检测情绪词
      const emotions = text.match(/害怕|恐惧|开心|快乐|悲伤|孤独|焦虑|平静|兴奋/g)
      if (emotions) {
        emotions.forEach(e => {
          elementCounts[e] = (elementCounts[e] || 0) + 1
        })
      }
    })

    // 筛选出现 2 次以上的元素
    const recurring = Object.entries(elementCounts)
      .filter(([_, count]) => count >= 2)
      .map(([element]) => element)

    return recurring.length > 0 ? recurring.slice(0, 5) : null
  },

  /**
   * 从问答中推断情绪基线
   */
  inferEmotionalBaseline(answers) {
    if (answers.length === 0) return null

    const positiveWords = /开心|快乐|满足|平静|期待|兴奋|幸福|轻松/g
    const negativeWords = /害怕|恐惧|焦虑|悲伤|孤独|紧张|不安|压力/g
    const neutralWords = /一般|普通|平常|还好|普通/g

    let positiveCount = 0
    let negativeCount = 0
    let neutralCount = 0

    answers.forEach(a => {
      const text = (a.questionText || '') + (a.answerText || '')
      if (positiveWords.test(text)) positiveCount++
      if (negativeWords.test(text)) negativeCount++
      if (neutralWords.test(text)) neutralCount++
    })

    const total = positiveCount + negativeCount + neutralCount
    if (total === 0) return null

    const positiveRatio = positiveCount / total
    const negativeRatio = negativeCount / total

    if (positiveRatio > 0.5) {
      return 'positive'
    } else if (negativeRatio > 0.5) {
      return 'negative'
    } else {
      return 'neutral'
    }
  },

  /**
   * 构建辅助线索上下文
   * @param {string} openid - 用户 openid
   * @param {string} currentSessionId - 当前 session ID
   * @returns {string} 辅助线索文本（用于 AI prompt）
   */
  async buildClueContext(openid, currentSessionId) {
    const clues = await this.getUserClues(openid, currentSessionId)

    if (!clues.hasHistory) {
      return ''
    }

    const parts = []

    if (clues.dreamPatterns) {
      parts.push(`【用户梦境主题偏好】：${clues.dreamPatterns.join('、')}`)
    }

    if (clues.recurringElements) {
      parts.push(`【用户常出现的元素】：${clues.recurringElements.join('、')}`)
    }

    if (clues.emotionalBaseline) {
      const emotionText = {
        positive: '整体情绪偏积极',
        negative: '整体情绪偏消极/焦虑',
        neutral: '整体情绪较为中性'
      }
      parts.push(`【用户近期情绪倾向】：${emotionText[clues.emotionalBaseline]}`)
    }

    return parts.length > 0
      ? `\n\n【辅助参考 - 用户历史数据】（仅供参考）：\n${parts.join('\n')}`
      : ''
  }
}

module.exports = auxiliaryClueService
