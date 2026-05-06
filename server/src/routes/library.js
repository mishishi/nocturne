import { prisma } from '../config/database.js'
import { successResponse, errorResponse } from '../config/response.js'

export default async function libraryRoutes(fastify, opts) {

  // 获取所有已发布的合集
  fastify.get('/library/collections', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          theme: { type: 'string' },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 }
        }
      }
    }
  }, async (req, res) => {
    try {
      const { theme, page = 1, limit = 20 } = req.query
      const skip = (page - 1) * limit

      const where = {
        status: 'published'
      }
      if (theme && theme !== 'all') {
        where.theme = theme
      }

      const [collections, total] = await Promise.all([
        prisma.collection.findMany({
          where,
          orderBy: { order: 'asc' },
          skip,
          take: limit,
          include: {
            _count: {
              select: { episodes: true }
            }
          }
        }),
        prisma.collection.count({ where })
      ])

      return successResponse({
        collections: collections.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          cover: c.cover,
          theme: c.theme,
          storyCount: c._count.episodes,
          createdAt: c.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + collections.length < total
        }
      })
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('获取合集列表失败', 'SERVER_ERROR'))
    }
  })

  // 获取合集详情（包含章节列表）
  fastify.get('/library/collections/:id', async (req, res) => {
    try {
      const { id } = req.params

      const collection = await prisma.collection.findUnique({
        where: { id },
        include: {
          episodes: {
            orderBy: { order: 'asc' },
            include: {
              storyAsset: {
                include: {
                  session: {
                    select: {
                      id: true,
                      dreamFragment: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!collection) {
        return res.status(404).send(errorResponse('合集不存在', 'NOT_FOUND'))
      }

      if (collection.status !== 'published') {
        return res.status(404).send(errorResponse('合集不存在', 'NOT_FOUND'))
      }

      // 获取每个 episode 的故事信息
      const episodes = collection.episodes.map(ep => {
        const session = ep.storyAsset?.session
        return {
          id: ep.id,
          order: ep.order,
          title: ep.title,
          excerpt: ep.excerpt,
          sessionId: ep.sessionId,
          dreamFragment: session?.dreamFragment?.slice(0, 100) || '',
          createdAt: ep.createdAt
        }
      })

      return successResponse({
        collection: {
          id: collection.id,
          title: collection.title,
          description: collection.description,
          cover: collection.cover,
          theme: collection.theme,
          createdAt: collection.createdAt,
          episodes
        }
      })
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('获取合集详情失败', 'SERVER_ERROR'))
    }
  })

  // 获取图书馆统计数据
  fastify.get('/library/stats', async (req, res) => {
    try {
      const [totalCollections, totalEpisodes, qualityStats] = await Promise.all([
        prisma.collection.count({ where: { status: 'published' } }),
        prisma.episode.count(),
        prisma.storyAsset.groupBy({
          by: ['qualityLevel'],
          _count: true
        })
      ])

      const stats = {
        totalCollections,
        totalStories: totalEpisodes,
        normalCount: 0,
        premiumCount: 0,
        curatedCount: 0
      }

      qualityStats.forEach(s => {
        if (s.qualityLevel === 'premium') stats.premiumCount = s._count
        else if (s.qualityLevel === 'curated') stats.curatedCount = s._count
        else stats.normalCount = s._count
      })

      return successResponse({ stats })
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('获取统计数据失败', 'SERVER_ERROR'))
    }
  })

  // 获取优质故事列表（供管理员选择加入合集）
  fastify.get('/library/assets', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          quality: { type: 'string', enum: ['normal', 'premium', 'curated'] },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 }
        }
      }
    }
  }, async (req, res) => {
    try {
      const { quality, page = 1, limit = 20 } = req.query
      const skip = (page - 1) * limit

      const where = {}
      if (quality) {
        where.qualityLevel = quality
      }

      const [assets, total] = await Promise.all([
        prisma.storyAsset.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            session: {
              select: {
                id: true,
                dreamFragment: true
              }
            }
          }
        }),
        prisma.storyAsset.count({ where })
      ])

      return successResponse({
        assets: assets.map(a => ({
          id: a.id,
          sessionId: a.sessionId,
          qualityLevel: a.qualityLevel,
          dreamFragment: a.session.dreamFragment?.slice(0, 100) || '',
          createdAt: a.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + assets.length < total
        }
      })
    } catch (err) {
      fastify.log.error(err)
      return res.status(500).send(errorResponse('获取故事列表失败', 'SERVER_ERROR'))
    }
  })
}
