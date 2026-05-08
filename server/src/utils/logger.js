import pino from 'pino'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const LOG_DIR = process.env.LOG_DIR || join(__dirname, '../../logs')

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true })
}

// Get current date for log file name
const getLogFileName = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `auth.${year}${month}${day}.log`
}

// Create pino logger with file output
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  },
  base: {
    service: 'yeelin-auth',
    version: '1.0.0'
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.newPassword',
      'req.body.oldPassword',
      'req.body.code',
      'phone',
      'email'
    ],
    censor: '***'
  }
},
// Write to daily rotating log file
createWriteStream(join(LOG_DIR, getLogFileName()), { flags: 'a' }))

// Create child loggers for different modules
export const authLogger = logger.child({ module: 'auth' })
export const tokenLogger = logger.child({ module: 'token' })
export const wechatLogger = logger.child({ module: 'wechat' })

// Helper to mask sensitive data
export function maskPhone(phone) {
  if (!phone || phone.length < 7) return '***'
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return '***'
  const [local, domain] = email.split('@')
  return local.slice(0, 2) + '***@' + domain
}

export function maskIp(ip) {
  if (!ip) return '***'
  const parts = ip.split('.')
  if (parts.length !== 4) return '***'
  return parts.slice(0, 2).join('.') + '.***.***'
}

export default logger
