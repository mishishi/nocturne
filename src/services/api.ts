// Real API service - connects to Express backend
// In development, use mock API for UI testing

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export const api = {
  // Create session
  async createSession(openid: string): Promise<{ sessionId: string; status: string }> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openid })
    })
    return res.json()
  },

  // Submit dream and get all questions
  async submitDream(sessionId: string, content: string): Promise<{ success: boolean; questions: string[]; questionIndex: number }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/dream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    return res.json()
  },

  // Submit answer and get next question or story
  async submitAnswer(sessionId: string, answer: string): Promise<{
    success: boolean
    nextQuestion?: string
    nextIndex?: number
    story?: { title: string; content: string }
  }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer })
    })
    return res.json()
  },

  // Get story
  async getStory(sessionId: string): Promise<{ story: { title: string; content: string } }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/story`)
    return res.json()
  },

  // Get user history
  async getHistory(openid: string): Promise<{ sessions: Array<{
    id: string
    date: string
    dreamFragment: string
    storyTitle: string
    story: string
  }> }> {
    const res = await fetch(`${API_BASE}/sessions/users/${openid}/history`)
    return res.json()
  }
}
