/**
 * Content Safety Service
 * Provides content moderation for user-generated text (dream content, comments, etc.)
 *
 * Verdict levels:
 * - safe: Content is acceptable, proceed normally
 * - review: Content needs human review (admin approval required)
 * - blocked: Content is clearly violating rules, reject immediately
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load moderation word lists
let MODERATION_WORDS = { blocked: { categories: {} }, review: { categories: {} } }

try {
  const wordsPath = join(__dirname, '../config/moderation-words.json')
  const wordsContent = readFileSync(wordsPath, 'utf-8')
  MODERATION_WORDS = JSON.parse(wordsContent)
} catch (err) {
  console.warn('Failed to load moderation-words.json, using empty rules:', err.message)
}

// Compile blocked word patterns
const blockedPatterns = []
if (MODERATION_WORDS.blocked?.categories) {
  for (const category of Object.values(MODERATION_WORDS.blocked.categories)) {
    if (category.words) {
      for (const word of category.words) {
        blockedPatterns.push({
          pattern: new RegExp(word, 'gi'),
          category: category.name
        })
      }
    }
  }
}

// Compile review patterns (supports both words and regex patterns)
const reviewPatterns = []
if (MODERATION_WORDS.review?.categories) {
  for (const category of Object.values(MODERATION_WORDS.review.categories)) {
    if (category.patterns) {
      for (const pattern of category.patterns) {
        reviewPatterns.push({
          pattern: new RegExp(pattern, 'gi'),
          category: category.name
        })
      }
    }
    if (category.words) {
      for (const word of category.words) {
        reviewPatterns.push({
          pattern: new RegExp(word, 'gi'),
          category: category.name
        })
      }
    }
  }
}

/**
 * Check text against blocked patterns
 * @returns {{ blocked: boolean, reason?: string, category?: string }}
 */
function checkBlockedPatterns(text) {
  for (const { pattern, category } of blockedPatterns) {
    pattern.lastIndex = 0 // Reset regex state
    if (pattern.test(text)) {
      return { blocked: true, reason: `包含${category}内容`, category }
    }
  }
  return { blocked: false }
}

/**
 * Check text against review patterns
 * @returns {{ needsReview: boolean, reasons: string[] }}
 */
function checkReviewPatterns(text) {
  const reasons = []
  for (const { pattern, category } of reviewPatterns) {
    pattern.lastIndex = 0
    if (pattern.test(text)) {
      reasons.push(category)
    }
  }
  return { needsReview: reasons.length > 0, reasons: [...new Set(reasons)] }
}

/**
 * Check content safety
 * @param {string} text - Text to check
 * @param {Object} options - Options
 * @param {boolean} options.enableAI - Enable AI moderation (reserved for future)
 * @returns {Promise<{ safe: boolean, verdict?: 'safe' | 'review' | 'blocked', reason?: string }>}
 */
export async function checkContentSafety(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return { safe: true, verdict: 'safe' }
  }

  const trimmedText = text.trim()

  // Step 1: Check blocked patterns - immediate rejection
  const blockedResult = checkBlockedPatterns(trimmedText)
  if (blockedResult.blocked) {
    return {
      safe: false,
      verdict: 'blocked',
      reason: blockedResult.reason || '内容包含违规信息'
    }
  }

  // Step 2: Check review patterns - needs human review
  const reviewResult = checkReviewPatterns(trimmedText)
  if (reviewResult.needsReview) {
    return {
      safe: false,
      verdict: 'review',
      reason: `内容需要审核 (${reviewResult.reasons.join(', ')})`
    }
  }

  // Step 3: Reserved AI moderation integration point
  if (options.enableAI && process.env.AI_MODERATION_ENDPOINT) {
    // Future: Call AI moderation service
    // const aiResult = await callAIModeration(trimmedText)
    // return parseAIResult(aiResult)
  }

  return { safe: true, verdict: 'safe' }
}

export default { checkContentSafety }
