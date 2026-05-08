import { prisma } from '../config/database.js'
import { Prisma } from '@prisma/client'
import logger from '../utils/logger.js'
// debug: trigger reload

const SLOW_THRESHOLD = parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000', 10)

// Record a request metric
export async function recordMetric({ endpoint, method, duration, status }) {
  const now = new Date()
  const date = now.toISOString().slice(0, 10) // YYYY-MM-DD
  const hour = now.getUTCHours()

  const isSlow = duration > SLOW_THRESHOLD
  const isError = status >= 500

  try {
    await prisma.metricsHourly.upsert({
      where: {
        date_hour_endpoint_method: {
          date,
          hour,
          endpoint,
          method
        }
      },
      update: {
        requestCount: { increment: 1 },
        totalDuration: { increment: duration },
        slowCount: isSlow ? { increment: 1 } : undefined,
        errorCount: isError ? { increment: 1 } : undefined
        // Note: minDuration and maxDuration updates are handled separately via raw SQL
      },
      create: {
        date,
        hour,
        endpoint,
        method,
        requestCount: 1,
        totalDuration: duration,
        slowCount: isSlow ? 1 : 0,
        errorCount: isError ? 1 : 0,
        maxDuration: duration,
        minDuration: duration
      }
    })
    // Update min/max after upsert
    if (duration > 0) {
      updateMinMaxMetric({ endpoint, method, duration }).catch(() => {})
    }
  } catch (error) {
    // Log but don't fail the request
    logger.error({ action: 'metrics-error', error: error.message }, 'Failed to record metric')
  }
}

// Update min/max using raw query for atomic operation
export async function updateMinMaxMetric({ endpoint, method, duration }) {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const hour = now.getUTCHours()

  try {
    await prisma.$executeRaw`
      UPDATE "MetricsHourly"
      SET "maxDuration" = GREATEST("maxDuration", ${duration}),
          "minDuration" = LEAST("minDuration", ${duration}),
          "updatedAt" = NOW()
      WHERE "date" = ${date}
        AND "hour" = ${hour}
        AND "endpoint" = ${endpoint}
        AND "method" = ${method}
    `
  } catch (error) {
    console.error('Failed to update min/max metric:', error.message)
  }
}

// Get metrics for dashboard
export async function getMetrics({ startDate, endDate, interval = 'hour' }) {
  // interval: 'hour' | 'day'
  let query
  if (interval === 'day') {
    query = Prisma.sql`
      SELECT
        date,
        SUM("requestCount")::text as "requestCount",
        (SUM("totalDuration")::float / NULLIF(SUM("requestCount"), 0))::text as "avgDuration",
        SUM("slowCount")::text as "slowCount",
        SUM("errorCount")::text as "errorCount",
        MAX("maxDuration")::text as "maxDuration",
        MIN("minDuration")::text as "minDuration"
      FROM "MetricsHourly"
      WHERE "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY date
      ORDER BY date
    `
  } else {
    query = Prisma.sql`
      SELECT
        date,
        hour::text,
        SUM("requestCount")::text as "requestCount",
        (SUM("totalDuration")::float / NULLIF(SUM("requestCount"), 0))::text as "avgDuration",
        SUM("slowCount")::text as "slowCount",
        SUM("errorCount")::text as "errorCount",
        MAX("maxDuration")::text as "maxDuration",
        MIN("minDuration")::text as "minDuration"
      FROM "MetricsHourly"
      WHERE "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY date, hour
      ORDER BY date, hour
    `
  }

  const result = await prisma.$queryRaw(query)

  return result.map(row => ({
    date: String(row.date),
    hour: interval === 'hour' ? Number(row.hour) : undefined,
    requestCount: Number(row.requestCount),
    avgDuration: Number(row.avgDuration),
    slowCount: Number(row.slowCount),
    errorCount: Number(row.errorCount),
    maxDuration: Number(row.maxDuration),
    minDuration: Number(row.minDuration)
  }))
}

// Get top slowest endpoints
export async function getSlowEndpoints({ startDate, endDate, limit = 10, endpoint = null }) {
  let query
  if (endpoint) {
    query = Prisma.sql`
      SELECT
        date,
        endpoint,
        method,
        SUM("requestCount")::text as "requestCount",
        (SUM("totalDuration")::float / NULLIF(SUM("requestCount"), 0))::text as "avgDuration",
        SUM("slowCount")::text as "slowCount",
        SUM("errorCount")::text as "errorCount"
      FROM "MetricsHourly"
      WHERE "date" >= ${startDate} AND "date" <= ${endDate}
        AND method != 'OPTIONS'
        AND endpoint LIKE ${'%' + endpoint + '%'}
      GROUP BY date, endpoint, method
      ORDER BY "avgDuration" DESC
      LIMIT ${limit}
    `
  } else {
    query = Prisma.sql`
      SELECT
        date,
        endpoint,
        method,
        SUM("requestCount")::text as "requestCount",
        (SUM("totalDuration")::float / NULLIF(SUM("requestCount"), 0))::text as "avgDuration",
        SUM("slowCount")::text as "slowCount",
        SUM("errorCount")::text as "errorCount"
      FROM "MetricsHourly"
      WHERE "date" >= ${startDate} AND "date" <= ${endDate}
        AND method != 'OPTIONS'
      GROUP BY date, endpoint, method
      ORDER BY "avgDuration" DESC
      LIMIT ${limit}
    `
  }

  const result = await prisma.$queryRaw(query)

  return result.map(row => ({
    date: String(row.date),
    endpoint: row.endpoint,
    method: row.method,
    requestCount: Number(row.requestCount),
    avgDuration: Number(row.avgDuration),
    slowCount: Number(row.slowCount),
    errorCount: Number(row.errorCount)
  }))
}

// Get metrics summary for time range
export async function getMetricsSummary({ startDate, endDate }) {
  const result = await prisma.$queryRaw(Prisma.sql`
    SELECT
      SUM("requestCount")::text as "totalRequests",
      (SUM("totalDuration")::float / NULLIF(SUM("requestCount"), 0))::text as "avgDuration",
      SUM("slowCount")::text as "totalSlow",
      SUM("errorCount")::text as "totalErrors",
      MAX("maxDuration")::text as "maxDuration",
      MIN("minDuration")::text as "minDuration"
    FROM "MetricsHourly"
    WHERE "date" >= ${startDate} AND "date" <= ${endDate}
  `)

  const row = result[0]
  // No data case - return zeros
  if (!row || row.totalRequests === null) {
    return {
      totalRequests: 0,
      avgDuration: 0,
      totalSlow: 0,
      totalErrors: 0,
      maxDuration: 0,
      minDuration: 0
    }
  }

  return {
    totalRequests: Number(row.totalRequests),
    avgDuration: Number(row.avgDuration),
    totalSlow: Number(row.totalSlow),
    totalErrors: Number(row.totalErrors),
    maxDuration: Number(row.maxDuration),
    minDuration: Number(row.minDuration)
  }
}
