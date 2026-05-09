import { vi } from 'vitest'

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing'
process.env.TOKEN_SECRET = 'test-token-secret-for-testing'
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-for-testing'

// Global teardown
export default {
  teardown() {
    // Clean up any mocks
    vi.clearAllMocks()
  }
}
