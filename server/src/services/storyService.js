const API_URL = 'https://api.minimaxi.com/v1/chat/completions'

const STORY_PROMPT = `你是一个故事作家。基于用户分享的梦境碎片和回答，创作一个500-800字的完整故事。

要求：
1. 故事要有开头、发展、高潮、结尾
2. 融入用户梦境中的关键元素
3. 语言优美、有画面感
4. **不要使用任何 Markdown 格式**（如 # 标题、- 列表等），纯段落文本
5. 故事完成后，给这个故事起一个简短而有诗意的标题（用《》包裹），放在故事最后

用户的梦境碎片：`

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


export const storyService = {
  async generateStory(dreamFragment, answers) {
    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) throw new Error('MINIMAX_API_KEY not configured')

    const detailsText = answers.map((a, i) => `问题${i+1}: ${a.question}\n回答: ${a.answer}`).join('\n')

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7-highspeed',
        messages: [
          { role: 'user', content: STORY_PROMPT + dreamFragment + '\n\n用户补充细节：\n' + detailsText }
        ],
        temperature: 0.8
      })
    })

    const data = await response.json()
    console.log('Story API response:', JSON.stringify(data, null, 2))
    let content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : ''

    // Remove thinking content
    const thinkEnd = '</t' + 'hink>'
    const idx = content.indexOf(thinkEnd)
    if (idx !== -1) {
      content = content.substring(idx + thinkEnd.length)
    }

    // Extract title from 《》
    const titleMatch = content.match(/《([^》]+)》/)
    let title = '无题'
    let storyContent = content

    if (titleMatch) {
      title = titleMatch[1]
      // Remove title line from story content
      storyContent = content.replace(/《[^》]+》\s*/, '').trim()
    }

    return {
      title: '《' + title + '》',
      content: storyContent,
      tokens: {
        prompt: data.usage ? data.usage.prompt_tokens : 0,
        completion: data.usage ? data.usage.completion_tokens : 0
      }
    }
  },

  async generateInterpretation(storyTitle, storyContent, dreamFragment, answers) {
    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) throw new Error('MINIMAX_API_KEY not configured')

    // Build context from dream fragment and Q&A
    const detailsText = answers.map((a, i) => `问题${i + 1}: ${a.question}\n回答: ${a.answer}`).join('\n')

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7-highspeed',
        messages: [
          { role: 'user', content: INTERPRETATION_PROMPT + `\n\n故事标题：${storyTitle}\n\n${storyContent}\n\n用户梦境碎片：${dreamFragment}\n\n用户补充细节：\n${detailsText}` }
        ],
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
      tokens: {
        prompt: data.usage ? data.usage.prompt_tokens : 0,
        completion: data.usage ? data.usage.completion_tokens : 0
      }
    }
  }
}
