import Fastify from 'fastify'
import cors from '@fastify/cors'
import { connectDB } from './config/database.js'
import sessionRoutes from './routes/sessions.js'

const fastify = Fastify({ logger: true })

// Register plugins
await fastify.register(cors, { origin: true })

// Register routes
fastify.register(sessionRoutes, { prefix: '/api' })

// Error handler
fastify.setErrorHandler((err, req, res) => {
  fastify.log.error(err)
  res.status(500).send({ error: err.message || 'Internal server error' })
})

const start = async () => {
  try {
    await connectDB()
    await fastify.listen({ port: process.env.PORT || 4000 })
    console.log(`Server running on port ${process.env.PORT || 4000}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
