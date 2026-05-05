const { prisma } = require('../utils/prisma')

/**
 * 用户解读偏好服务
 * 根据用户历史反馈，动态调整解读的详细程度
 */
const interpretationPreferenceService = {
  /**
   * 获取用户的解读偏好设置
   * @param {string} openid - 用户openid
   * @returns {Object} { depthLevel, inaccurateCount, totalCount, accuracyRate }
   */
  async getUserPreference(openid) {
    // 获取该用户的所有解读反馈
    const feedbacks = await prisma.interpretationFeedback.findMany({
      where: { openid },
      orderBy: { createdAt: 'desc' },
      take: 20 // 只看最近20条
    })

    if (feedbacks.length === 0) {
      return {
        depthLevel: 'standard',
        inaccurateCount: 0,
        totalCount: 0,
        accuracyRate: null
      }
    }

    const inaccurateCount = feedbacks.filter(f => f.isAccurate === false).length
    const totalCount = feedbacks.length
    const accuracyRate = (totalCount - inaccurateCount) / totalCount

    // 如果不准确率超过40%，使用详细模式
    // 不准确率 = inaccurateCount / totalCount > 0.4
    const depthLevel = inaccurateCount > totalCount * 0.4 ? 'detailed' : 'standard'

    return {
      depthLevel,
      inaccurateCount,
      totalCount,
      accuracyRate: Math.round(accuracyRate * 100)
    }
  },

  /**
   * 获取用户的详细程度级别
   * @param {string} openid - 用户openid
   * @returns {'standard' | 'detailed'}
   */
  async getDepthLevel(openid) {
    const pref = await this.getUserPreference(openid)
    return pref.depthLevel
  }
}

module.exports = interpretationPreferenceService
