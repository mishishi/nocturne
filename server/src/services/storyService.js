const API_URL = 'https://api.minimaxi.com/v1/chat/completions'

const STORY_PROMPT = `你是一个故事作家。基于用户分享的梦境碎片和回答，创作一个500-800字的完整故事。

要求：
1. 故事要有开头、发展、高潮、结尾
2. 融入用户梦境中的关键元素
3. 语言优美、有画面感
4. **不要使用任何 Markdown 格式**（如 # 标题、- 列表等），纯段落文本
5. 故事完成后，给这个故事起一个简短而有诗意的标题（用《》包裹），放在故事最后

用户的梦境碎片：`

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
  }
}
