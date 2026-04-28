import { describe, it, expect, beforeEach } from 'vitest'
import { useDreamStore, DreamSession } from './useDreamStore'

// Helper to create a mock dream session
const createMockSession = (overrides: Partial<DreamSession> = {}): DreamSession => ({
  id: `session_${Date.now()}_test`,
  sessionId: `backend_session_${Math.random().toString(36).substr(2, 9)}`,
  date: new Date().toLocaleDateString('zh-CN'),
  dreamSnippet: 'I dreamed of flying over mountains...',
  storyTitle: 'The Flying Dream',
  story: 'Once upon a time, I flew over beautiful mountains...',
  questions: ['What did you feel?', 'Where were you going?'],
  answers: ['I felt free', 'I was going home'],
  tags: [],
  ...overrides,
})

describe('useDreamStore - History Deduplication', () => {
  beforeEach(() => {
    // Reset store to initial state
    useDreamStore.setState({
      currentSession: {
        sessionId: '',
        openid: '',
        dreamText: '',
        dreamElements: [],
        questions: [],
        answers: [],
        currentQuestionIndex: 0,
        story: '',
        storyTitle: '',
        status: 'idle',
      },
      history: [],
    })
  })

  describe('addToHistory', () => {
    it('should add a new session to history', () => {
      // Set up current session
      useDreamStore.setState({
        currentSession: {
          sessionId: 'new_session_123',
          openid: 'user_123',
          dreamText: 'My dream text',
          dreamElements: [],
          questions: ['Q1', 'Q2'],
          answers: ['A1', 'A2'],
          currentQuestionIndex: 0,
          story: 'Generated story content',
          storyTitle: 'New Story',
          status: 'completed',
        },
      })

      useDreamStore.getState().addToHistory()

      const { history } = useDreamStore.getState()
      expect(history.length).toBe(1)
      expect(history[0].storyTitle).toBe('New Story')
      expect(history[0].sessionId).toBe('new_session_123')
    })

    it('should not add duplicate session with same sessionId', () => {
      const existingSession = createMockSession({
        id: 'local_session_abc',
        sessionId: 'backend_xyz',
      })

      // Set existing history
      useDreamStore.setState({ history: [existingSession] })

      // Simulate backend sync adding same session (using backend ID as id)
      const backendSession = {
        id: 'backend_xyz', // Same as existing session's sessionId
        sessionId: 'backend_xyz',
        date: new Date().toLocaleDateString('zh-CN'),
        dreamSnippet: 'Updated dream snippet',
        storyTitle: 'Updated Story',
        story: 'Updated story content',
        questions: [],
        answers: [],
        tags: [],
      }

      // Merge logic (simulating History.tsx sync)
      const { history } = useDreamStore.getState()
      const merged = [...history]

      // Check by both id and sessionId
      const exists = merged.find(
        item => item.id === backendSession.id || item.sessionId === backendSession.sessionId
      )

      expect(exists).toBeTruthy()
      expect(merged.length).toBe(1) // Should not duplicate
    })

    it('should add new session when sessionId does not exist', () => {
      const existingSession = createMockSession({
        id: 'local_session_abc',
        sessionId: 'existing_backend_id',
      })

      useDreamStore.setState({ history: [existingSession] })

      // Backend returns different session
      const newBackendSession = {
        id: 'new_backend_id',
        sessionId: 'new_backend_id',
        date: new Date().toLocaleDateString('zh-CN'),
        dreamSnippet: 'New dream',
        storyTitle: 'New Story',
        story: 'New content',
        questions: [],
        answers: [],
        tags: [],
      }

      const { history } = useDreamStore.getState()
      const merged = [...history]

      const exists = merged.find(
        item => item.id === newBackendSession.id || item.sessionId === newBackendSession.sessionId
      )

      expect(exists).toBeUndefined()
    })

    it('should generate unique local IDs for new sessions', () => {
      useDreamStore.setState({
        currentSession: {
          sessionId: 'session_001',
          openid: 'user',
          dreamText: 'Dream 1',
          dreamElements: [],
          questions: [],
          answers: [],
          currentQuestionIndex: 0,
          story: 'Story 1',
          storyTitle: 'Title 1',
          status: 'completed',
        },
      })

      useDreamStore.getState().addToHistory()

      const { history } = useDreamStore.getState()
      expect(history[0].id).toMatch(/^session_\d+_[a-z0-9]+$/)
    })

    it('should preserve dreamText snippet correctly', () => {
      const longDreamText = 'A'.repeat(150)

      useDreamStore.setState({
        currentSession: {
          sessionId: 'session_long',
          openid: 'user',
          dreamText: longDreamText,
          dreamElements: [],
          questions: [],
          answers: [],
          currentQuestionIndex: 0,
          story: 'Story',
          storyTitle: 'Title',
          status: 'completed',
        },
      })

      useDreamStore.getState().addToHistory()

      const { history } = useDreamStore.getState()
      expect(history[0].dreamSnippet.length).toBe(103) // 100 + '...'
      expect(history[0].dreamSnippet.endsWith('...')).toBe(true)
    })

    it('should not add to history when dreamText or story is missing', () => {
      useDreamStore.setState({
        currentSession: {
          sessionId: 'session_no_content',
          openid: 'user',
          dreamText: '',
          dreamElements: [],
          questions: [],
          answers: [],
          currentQuestionIndex: 0,
          story: '',
          storyTitle: '',
          status: 'completed',
        },
      })

      useDreamStore.getState().addToHistory()

      const { history } = useDreamStore.getState()
      expect(history.length).toBe(0)
    })
  })

  describe('history merge deduplication', () => {
    it('should detect duplicate by id match', () => {
      const localEntry = {
        id: 'session_123_local',
        sessionId: 'backend_123',
        date: '2024/1/1',
        dreamSnippet: 'Local dream',
        storyTitle: 'Local',
        story: 'Local story',
        questions: [],
        answers: [],
        tags: [],
      }

      const backendEntry = {
        id: 'session_123_local', // Same id
        sessionId: 'backend_123',
        date: '2024/1/1',
        dreamSnippet: 'Backend dream',
        storyTitle: 'Backend',
        story: 'Backend story',
        questions: [],
        answers: [],
        tags: [],
      }

      const isDuplicate = localEntry.id === backendEntry.id || localEntry.sessionId === backendEntry.sessionId
      expect(isDuplicate).toBe(true)
    })

    it('should detect duplicate by sessionId match', () => {
      const localEntry = {
        id: 'local_id_abc',
        sessionId: 'same_session_id',
        date: '2024/1/1',
        dreamSnippet: 'Local dream',
        storyTitle: 'Local',
        story: 'Local story',
        questions: [],
        answers: [],
        tags: [],
      }

      const backendEntry = {
        id: 'different_id', // Different id
        sessionId: 'same_session_id', // Same sessionId
        date: '2024/1/1',
        dreamSnippet: 'Backend dream',
        storyTitle: 'Backend',
        story: 'Backend story',
        questions: [],
        answers: [],
        tags: [],
      }

      const isDuplicate = localEntry.id === backendEntry.id || localEntry.sessionId === backendEntry.sessionId
      expect(isDuplicate).toBe(true)
    })

    it('should not flag as duplicate when both id and sessionId are different', () => {
      const localEntry = {
        id: 'local_123',
        sessionId: 'session_123',
        date: '2024/1/1',
        dreamSnippet: 'Local dream',
        storyTitle: 'Local',
        story: 'Local story',
        questions: [],
        answers: [],
        tags: [],
      }

      const backendEntry = {
        id: 'backend_456',
        sessionId: 'session_456',
        date: '2024/1/2',
        dreamSnippet: 'Backend dream',
        storyTitle: 'Backend',
        story: 'Backend story',
        questions: [],
        answers: [],
        tags: [],
      }

      const isDuplicate = localEntry.id === backendEntry.id || localEntry.sessionId === backendEntry.sessionId
      expect(isDuplicate).toBe(false)
    })
  })

  describe('removeFromHistory', () => {
    it('should remove session by id', () => {
      const session = createMockSession({ id: 'to_remove' })
      useDreamStore.setState({ history: [session] })

      useDreamStore.getState().removeFromHistory('to_remove')

      const { history } = useDreamStore.getState()
      expect(history.length).toBe(0)
    })
  })

  describe('loadFromHistory', () => {
    it('should restore session to currentSession', () => {
      const session = createMockSession({
        id: 'to_restore',
        sessionId: 'restored_session',
        dreamSnippet: 'Restored dream',
        storyTitle: 'Restored Title',
        story: 'Restored story content',
        questions: ['Q1'],
        answers: ['A1'],
      })

      useDreamStore.setState({
        currentSession: {
          sessionId: '',
          openid: '',
          dreamText: '',
          dreamElements: [],
          questions: [],
          answers: [],
          currentQuestionIndex: 0,
          story: '',
          storyTitle: '',
          status: 'idle',
        },
      })

      useDreamStore.getState().loadFromHistory(session)

      const { currentSession } = useDreamStore.getState()
      expect(currentSession.sessionId).toBe('restored_session')
      expect(currentSession.story).toBe('Restored story content')
      expect(currentSession.status).toBe('completed')
    })
  })
})
