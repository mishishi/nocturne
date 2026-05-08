import pino from 'pino'
import rotate from 'pino-rotate'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const LOG_DIR = process.env.LOG_DIR || join(__dirname, '../../logs')
const MAX_FILES = process.env.LOG_MAX_FILES || '7d' // 保留7天

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true })
}

// Create rotating file transport
const transport = await rotate({
  file: join(LOG_DIR, 'auth.%Y%m%d.log'), // 每天一个新文件
  limit: MAX_FILES, // 保留天数
  json: true, // JSON 格式便于后续解析
  // 格式化：添加易读的时间戳
  formatter: (obj) => {
    const { time, level, msg, reqId, userId, action, duration, ip, ...rest } = obj
    let line = `[${time}] ${level.toUpperCase()}`
    if (reqId) line += ` [${reqId}]`
    if (action) line += ` [${action}]`
    if (userId) line += ` user=${userId}`
    if (ip) line += ` ip=${ip}`
    if (duration) line += ` duration=${duration}ms`
    if (msg) line += ` - ${msg}`
    if (Object.keys(rest).length > 0) {
      line += ` ${JSON.stringify(rest)}`
    }
    return line + '\n'
  }
})

// Create pino logger with rotation transport
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  },
  // Base fields added to every log
  base: {
    service: 'yeelin-auth',
    version: '1.0.0'
  },
  // Sensitive fields redacted in output
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
}, transport)

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
