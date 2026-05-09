import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockModerationData = {
  blocked: {
    categories: {
      violence: {
        name: '暴力',
        words: ['打架', '杀人', '暴力']
      },
      politics: {
        name: '政治',
        words: ['反动', '颠覆']
      }
    }
  },
  review: {
    categories: {
      adult: {
        name: '成人内容',
        words: ['敏感词1', '敏感词2']
      },
      gambling: {
        name: '赌博',
        patterns: ['赌.*博', '诈.*骗']
      }
    }
  }
}

// Mock fs before importing contentSafety
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => JSON.stringify(mockModerationData))
}))

// Import after mocking
const { checkContentSafety } = await import('../../src/services/contentSafety.js')

describe('ContentSafety Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkContentSafety', () => {
    it('should return safe for clean content', async () => {
      const result = await checkContentSafety('今天做了一个美好的梦')
      expect(result.safe).toBe(true)
      expect(result.verdict).toBe('safe')
    })

    it('should return safe for empty or null text', async () => {
      const result1 = await checkContentSafety('')
      expect(result1.safe).toBe(true)
      expect(result1.verdict).toBe('safe')

      const result2 = await checkContentSafety(null)
      expect(result2.safe).toBe(true)
      expect(result2.verdict).toBe('safe')

      const result3 = await checkContentSafety(undefined)
      expect(result3.safe).toBe(true)
      expect(result3.verdict).toBe('safe')
    })

    it('should return safe for whitespace-only text', async () => {
      const result = await checkContentSafety('   \n\t  ')
      expect(result.safe).toBe(true)
      expect(result.verdict).toBe('safe')
    })

    it('should block content with blocked words (violence)', async () => {
      const result = await checkContentSafety('我梦见有人打架了')
      expect(result.safe).toBe(false)
      expect(result.verdict).toBe('blocked')
      expect(result.reason).toContain('暴力')
    })

    it('should block content with blocked words (politics)', async () => {
      const result = await checkContentSafety('这是反动的言论')
      expect(result.safe).toBe(false)
      expect(result.verdict).toBe('blocked')
      expect(result.reason).toContain('政治')
    })

    it('should mark content needing review', async () => {
      const result = await checkContentSafety('内容包含敏感词1')
      expect(result.safe).toBe(false)
      expect(result.verdict).toBe('review')
      expect(result.reason).toContain('审核')
      expect(result.reason).toContain('成人内容')
    })

    it('should handle regex patterns in review category', async () => {
      const result = await checkContentSafety('这是赌博的内容')
      expect(result.safe).toBe(false)
      expect(result.verdict).toBe('review')
      expect(result.reason).toContain('赌博')
    })

    it('should be case insensitive for blocked words', async () => {
      const result = await checkContentSafety('我梦见了杀人的场景')
      expect(result.safe).toBe(false)
      expect(result.verdict).toBe('blocked')
    })

    it('should trim text before checking', async () => {
      const result = await checkContentSafety('  暴力内容  ')
      expect(result.safe).toBe(false)
      expect(result.verdict).toBe('blocked')
    })

    it('should return safe when only review patterns matched but no blocked', async () => {
      const result = await checkContentSafety('正常内容没有敏感词')
      expect(result.safe).toBe(true)
      expect(result.verdict).toBe('safe')
    })

    it('should handle text with multiple violations (blocked takes priority)', async () => {
      const result = await checkContentSafety('打架并且反动')
      expect(result.safe).toBe(false)
      expect(result.verdict).toBe('blocked')
    })

    it('should handle long text content', async () => {
      const longText = '这是一个很长的梦境描述，'.repeat(100) + '正常内容'
      const result = await checkContentSafety(longText)
      expect(result.safe).toBe(true)
      expect(result.verdict).toBe('safe')
    })

    it('should handle unicode text', async () => {
      const result = await checkContentSafety('今天做了一个美好的梦 🛏️')
      expect(result.safe).toBe(true)
      expect(result.verdict).toBe('safe')
    })

    it('should detect blocked words in longer context', async () => {
      const result = await checkContentSafety('暴力团是什么')
      expect(result.safe).toBe(false)
      expect(result.verdict).toBe('blocked')
    })
  })
})
