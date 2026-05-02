// SSE client for story streaming using fetch + ReadableStream

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export interface StoryStreamCallbacks {
  onStart?: (data: { title: string }) => void
  onChunk?: (data: { content: string }) => void
  onDone?: (data: { title: string; content: string }) => void
  onError?: (error: Error) => void
}

export function createStoryStream(
  sessionId: string,
  callbacks: StoryStreamCallbacks
): () => void {
  const token = localStorage.getItem('yeelin_token')
  console.log('[SSE Client] Token present:', !!token, 'Token prefix:', token?.substring(0, 20))

  const url = `${API_BASE}/sessions/${sessionId}/story/stream`
  console.log('[SSE Client] Connecting to:', url)

  let aborted = false

  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).then(response => {
    if (!response.ok) {
      const errorMessages: Record<number, string> = {
        401: '登录已过期，请重新登录',
        403: '无权访问此会话',
        404: '会话不存在',
        500: '服务器繁忙，请稍后再试',
        502: '服务暂时不可用，请稍后再试',
        503: '服务暂时不可用，请稍后再试',
      }
      const message = errorMessages[response.status] || `请求失败 (${response.status})`
      throw new Error(message)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    function processEvents(text: string) {
      const lines = text.split('\n')
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          const eventType = line.slice(7)
          buffer = ''
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6)
          buffer += data
        } else if (line === '') {
          if (buffer) {
            try {
              const parsed = JSON.parse(buffer)
              console.log('[SSE Client] Event received, type:', parsed)

              if (parsed.title && !parsed.content) {
                callbacks.onStart?.(parsed)
              } else if (parsed.content && !parsed.title) {
                callbacks.onChunk?.(parsed)
              } else if (parsed.title && parsed.content) {
                callbacks.onDone?.(parsed)
              } else if (parsed.message) {
                callbacks.onError?.(new Error(parsed.message))
              }
            } catch (e) {
              console.error('[SSE Client] Failed to parse event data:', e)
            }
            buffer = ''
          }
        }
      }
    }

    function read() {
      if (aborted) {
        reader.cancel()
        return
      }

      reader.read().then(({ done, value }) => {
        if (done) {
          console.log('[SSE Client] Stream complete')
          return
        }

        const chunk = decoder.decode(value, { stream: true })
        console.log('[SSE Client] Received chunk:', chunk.substring(0, 100))
        processEvents(chunk)
        read()
      }).catch(error => {
        console.error('[SSE Client] Read error:', error)
        callbacks.onError?.(error)
      })
    }

    read()
  }).catch(error => {
    console.error('[SSE Client] Fetch error:', error)
    callbacks.onError?.(error)
  })

  // Return cleanup function
  return () => {
    console.log('[SSE Client] Cleaning up')
    aborted = true
  }
}
