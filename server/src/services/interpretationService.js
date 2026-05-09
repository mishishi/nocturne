import { prisma } from '../config/database.js'
import { storyService } from './storyService.js'
import { interpretationPreferenceService } from './interpretationPreferenceService.js'
import { auxiliaryClueService } from './auxiliaryClueService.js'

const COST = 10

/**
 * Generate interpretation for a story
 * @param {string} sessionId - Session ID
 * @param {string} userId - Internal user ID (from token)
 * @param {string} openid - User openid
 * @param {string} visibility - Interpretation visibility (private, friends, public)
 * @returns {Object} Interpretation result
 */
export async function generateInterpretation(sessionId, userId, openid, visibility = 'private') {
  // Validate visibility
  const validVisibilities = ['private', 'friends', 'public']
  const interpretationVisibility = validVisibilities.includes(visibility) ? visibility : 'private'

  // Get session with story and answers
  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session) {
    return { error: 'Session not found', code: 'NOT_FOUND' }
  }

  const story = await prisma.story.findUnique({ where: { sessionId } })
  if (!story) {
    return { error: 'Story not found', code: 'NOT_FOUND' }
  }

  // Check if interpretation already exists
  if (story.interpretation) {
    return {
      interpretation: story.interpretation,
      alreadyExists: true
    }
  }

  // Get user and check points
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { error: 'User not found', code: 'USER_NOT_FOUND' }
  }

  // Capture shouldShowModal BEFORE updating interpretationAutoShow
  const shouldShowModal = user.interpretationAutoShow

  if (user.points < COST) {
    return { error: `解读需要 ${COST} 积分，你的积分不足`, code: 'INSUFFICIENT_POINTS' }
  }

  // Get answers for context
  const answers = await prisma.answer.findMany({
    where: { sessionId },
    orderBy: { questionIndex: 'asc' }
  })

  // Get user's interpretation preference (adjusts depth based on past feedback)
  const depthLevel = await interpretationPreferenceService.getDepthLevel(openid)

  // Get user's auxiliary clues from historical data
  const auxiliaryClue = await auxiliaryClueService.buildClueContext(openid, sessionId)

  // Generate interpretation with appropriate depth and auxiliary clues
  const { interpretation, interpretationData, tokens, hasAuxiliaryClue } = await storyService.generateInterpretation(
    story.title,
    story.content,
    session.dreamFragment,
    answers.map(a => ({ question: a.questionText, answer: a.answerText })),
    depthLevel,
    auxiliaryClue,
    { structured: true }
  )

  // Use transaction to update points, interpretationAutoShow, and story
  await prisma.$transaction(async (tx) => {
    // Deduct points
    await tx.user.update({
      where: { openid },
      data: { points: { decrement: COST } }
    })

    // Update interpretationAutoShow to false (user has seen the feature)
    if (shouldShowModal) {
      await tx.user.update({
        where: { openid },
        data: { interpretationAutoShow: false }
      })
    }

    // Save interpretation
    await tx.story.update({
      where: { sessionId },
      data: {
        interpretation,
        interpretationData: interpretationData ? JSON.stringify(interpretationData) : null,
        interpretationVisibility,
        promptTokens: story.promptTokens + (tokens.prompt || 0),
        completionTokens: story.completionTokens + (tokens.completion || 0)
      }
    })
  })

  return {
    interpretation,
    interpretationData,
    interpretationVisibility,
    depthLevel,
    hasAuxiliaryClue,
    pointsUsed: COST,
    remainingPoints: user.points - COST,
    shouldShowModal
  }
}

/**
 * Update interpretation visibility
 */
export async function updateInterpretationVisibility(sessionId, openid, visibility) {
  const validVisibilities = ['private', 'friends', 'public']
  if (!visibility || !validVisibilities.includes(visibility)) {
    return { error: `visibility must be one of: ${validVisibilities.join(', ')}`, code: 'INVALID_VISIBILITY' }
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session) {
    return { error: 'Session not found', code: 'NOT_FOUND' }
  }

  if (session.openid !== openid) {
    return { error: '无权限修改此解读的可见性', code: 'FORBIDDEN' }
  }

  const story = await prisma.story.findUnique({ where: { sessionId } })
  if (!story) {
    return { error: 'Story not found', code: 'NOT_FOUND' }
  }
  if (!story.interpretation) {
    return { error: '解读不存在，无法设置可见性', code: 'INTERPRETATION_NOT_FOUND' }
  }

  await prisma.story.update({
    where: { sessionId },
    data: { interpretationVisibility: visibility }
  })

  return { interpretationVisibility: visibility }
}

export const interpretationService = {
  generateInterpretation,
  updateInterpretationVisibility
}

export default interpretationService
