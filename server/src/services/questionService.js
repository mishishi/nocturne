const API_URL = 'https://api.minimaxi.com/v1/chat/completions'

const SYSTEM_PROMPT = '你是一个梦境解读者。根据用户分享的梦境片段，生成5个引导问题来帮助用户回忆更多细节。每行一个问题，不要编号，不要解释。'

export const questionService = {
  async generateQuestions(dreamFragment) {
    console.time('generateQuestions')
    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) throw new Error('MINIMAX_API_KEY not configured')

    console.time('generateQuestions - API call')
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7-highspeed',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: '梦境内容：' + dreamFragment }
        ],
        temperature: 0.7
      })
    })
    console.timeEnd('generateQuestions - API call')

    console.time('generateQuestions - parse')
    const data = await response.json()
    console.log('[QuestionService] API response status:', response.status, 'usage:', JSON.stringify(data.usage))
    let content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : ''

    // Find the end of thinking marker and get content after it
    const thinkEnd = '</t' + 'hink>'
    const idx = content.indexOf(thinkEnd)
    if (idx !== -1) {
      content = content.substring(idx + thinkEnd.length)
    }

    // Get non-empty lines and take first 5
    const lines = content.split('\n').filter(l => l.trim().length > 0)
    const questions = lines.slice(0, 5).map(q => q.trim())

    console.log('[QuestionService] Final questions:', questions)
    console.timeEnd('generateQuestions')
    return questions
  }
}
