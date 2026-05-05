const API_URL = 'https://api.minimaxi.com/v1/chat/completions'

// 标签到风格方向的映射
const STYLE_HINTS = {
  peaceful: '叙事平缓、氛围宁静治愈',
  adventure: '节奏明快、充满探索与挑战',
  mystery: '悬疑紧张、充满未知与转折',
  nightmare: '压抑紧张、带有恐惧与不安',
  joyful: '轻松愉快、充满温暖与希望',
  fantasy: '天马行空、充满奇幻与想象力'
}

const STORY_PROMPT = `你是一个故事作家。基于用户分享的梦境碎片和回答，创作一个500-800字的完整故事。

要求：
1. 故事要有开头、发展、高潮、结尾
2. 融入用户梦境中的关键元素
3. 语言优美、有画面感
4. **不要使用任何 Markdown 格式**（如 # 标题、- 列表等），纯段落文本
5. 故事完成后，给这个故事起一个简短而有诗意的标题（用《》包裹），放在故事最后

用户的梦境碎片：`

// 标准解读 prompt
const INTERPRETATION_PROMPT = `你是一个梦境分析师。请根据以下梦境故事，提供深入的心理层面分析。

分析维度：
1. 梦中出现的重要人物、物品、场景的象征含义
2. 梦中的情绪线索（恐惧、渴望、压抑等）
3. 一个开放性问题，引导用户自我思考

**分析要求：**
- 风格温暖、亲切，像朋友间的对话
- 不要过度解读，保持开放性
- 每个维度用1-2句话阐述
- 最后的问题要引发思考，不要给出确定答案

**输出格式：**
【象征解读】
（对梦中关键元素的分析，2-3段）

【情绪线索】
（当前可能的心境状态，1-2段）

【自我思考】
（一个问题，引发反思）

---

梦境故事：`

// 详细解读 prompt（用于反馈不准确的用户）
const INTERPRETATION_DETAILED_PROMPT = `你是一个梦境分析师。用户之前的解读反馈不够准确，请提供更详细、更深入的个性化分析。

**分析要求：**
1. 深入挖掘梦中每个重要元素的潜在象征意义，结合作业心理学和认知科学视角
2. 详细分析情绪层次：从表层情感到深层无意识渴望
3. 探索梦与用户现实生活的潜在联系
4. 提供2-3个自我探索的方向性问题
5. 风格温暖、亲切，但分析要更专业、更深入
6. 保持开放性，不要给出确定的"标准答案"

**输出格式：**
【深入象征解读】
（对梦中关键元素的深度分析，4-5段，包含多个可能的解释角度）

【情绪层次分析】
（从表层到深层的情绪探索，2-3段）

【现实关联探索】
（梦与生活可能的联系，2-3段）

【自我探索指引】
（2-3个深度问题，帮助用户进一步理解自己）

---

梦境故事：`


export const storyService = {
  async *generateStoryStream(dreamFragment, answers, styleTag) {
    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) throw new Error('MINIMAX_API_KEY not configured')

    const styleHint = styleTag && STYLE_HINTS[styleTag] ? STYLE_HINTS[styleTag] : ''
    const detailsText = answers.map((a, i) => `问题${i + 1}: ${a.question}\n回答: ${a.answer}`).join('\n')

    const prompt = STORY_PROMPT + dreamFragment + '\n\n风格倾向：' + styleHint + '\n\n用户补充细节：\n' + detailsText

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7-highspeed',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 1200,
        temperature: 0.8,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`MiniMax API error: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''
    let title = '无题'
    let inThink = false
    let thinkContent = ''

    // Send initial title event
    yield { type: 'start', title: '《梦境编织中》' }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ''
            if (!content) continue

            // Filter thinking tags
            if (content.includes('<think>')) {
              inThink = true
              thinkContent += content.replace(/世家/g, '')
            }
            if (inThink) {
              thinkContent += content
              if (content.includes('</think>') || thinkContent.includes('</think>')) {
                const thinkEnd = thinkContent.indexOf('</think>')
                if (thinkEnd !== -1) {
                  thinkContent = thinkContent.substring(0, thinkEnd)
                }
                inThink = false
                thinkContent = ''
              }
              continue
            }

            // Extract title from 《》
            const titleMatch = content.match(/《([^》]+)》/)
            if (titleMatch && !title.includes(titleMatch[1])) {
              title = titleMatch[1]
            }

            // Send chunk
            const cleanContent = content.replace(/《[^》]*》/g, '').replace(/\s+/g, ' ').trim()
            if (cleanContent) {
              fullContent += cleanContent
              yield { type: 'chunk', content: cleanContent }
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }

    // Extract final content without title
    let storyContent = fullContent
    const titleMatch = fullContent.match(/《([^》]+)》/)
    if (titleMatch) {
      title = titleMatch[1]
      storyContent = fullContent.replace(/《[^》]+》\s*/, '').trim()
    }
    // Remove leading punctuation (comma, period, etc.) that may appear after title removal
    storyContent = storyContent.replace(/^[，,。.、;；:：]+/, '').trim()

    yield { type: 'done', title: '《' + title + '》', content: storyContent }
  },

  async generateStory(dreamFragment, answers, styleTag) {
    console.time('generateStory')
    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) throw new Error('MINIMAX_API_KEY not configured')

    const styleHint = styleTag && STYLE_HINTS[styleTag] ? STYLE_HINTS[styleTag] : ''
    const detailsText = answers.map((a, i) => `问题${i+1}: ${a.question}\n回答: ${a.answer}`).join('\n')

    const prompt = STORY_PROMPT + dreamFragment + '\n\n风格倾向：' + styleHint + '\n\n用户补充细节：\n' + detailsText
    console.log('[StoryService] prompt length:', prompt.length, 'chars')

    console.time('generateStory - API call')
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7-highspeed',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 1200,
        temperature: 0.8
      })
    })
    console.timeEnd('generateStory - API call')

    console.time('generateStory - parse response')
    const data = await response.json()
    console.log('[StoryService] API response status:', response.status, 'usage:', JSON.stringify(data.usage))
    let content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : ''

    // Remove thinking content
    const thinkEnd = '</t' + 'hink>'
    const idx = content.indexOf(thinkEnd)
    if (idx !== -1) {
      content = content.substring(idx + thinkEnd.length)
    }
    console.log('[StoryService] content length after parsing:', content.length, 'chars')
    console.timeEnd('generateStory - parse response')

    // Extract title from 《》
    const titleMatch = content.match(/《([^》]+)》/)
    let title = '无题'
    let storyContent = content

    if (titleMatch) {
      title = titleMatch[1]
      // Remove title line from story content
      storyContent = content.replace(/《[^》]+》\s*/, '').trim()
    }
    // Remove leading punctuation that may appear after title removal
    storyContent = storyContent.replace(/^[，,。.、;；:：]+/, '').trim()

    console.timeEnd('generateStory')
    return {
      title: '《' + title + '》',
      content: storyContent,
      tokens: {
        prompt: data.usage ? data.usage.prompt_tokens : 0,
        completion: data.usage ? data.usage.completion_tokens : 0
      }
    }
  },

  async generateInterpretation(storyTitle, storyContent, dreamFragment, answers, depthLevel = 'standard') {
    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) throw new Error('MINIMAX_API_KEY not configured')

    // Build context from dream fragment and Q&A
    const detailsText = answers.map((a, i) => `问题${i + 1}: ${a.question}\n回答: ${a.answer}`).join('\n')

    // 根据深度级别选择不同的 prompt
    const promptTemplate = depthLevel === 'detailed' ? INTERPRETATION_DETAILED_PROMPT : INTERPRETATION_PROMPT
    const maxTokens = depthLevel === 'detailed' ? 1200 : 600

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7-highspeed',
        messages: [
          { role: 'user', content: promptTemplate + `\n\n故事标题：${storyTitle}\n\n${storyContent}\n\n用户梦境碎片：${dreamFragment}\n\n用户补充细节：\n${detailsText}` }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    })

    const data = await response.json()
    console.log('Interpretation API response:', JSON.stringify(data, null, 2))

    let content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : ''

    // Remove thinking content if present
    const thinkEnd = '</t' + 'hink>'
    const idx = content.indexOf(thinkEnd)
    if (idx !== -1) {
      content = content.substring(idx + thinkEnd.length)
    }

    return {
      interpretation: content.trim(),
      depthLevel,
      tokens: {
        prompt: data.usage ? data.usage.prompt_tokens : 0,
        completion: data.usage ? data.usage.completion_tokens : 0
      }
    }
  }
}
