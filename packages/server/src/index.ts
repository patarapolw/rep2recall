import path from 'path'

import fastify from 'fastify'
import helmet from 'fastify-helmet'
import fastifyStatic from 'fastify-static'

import router from './api'
import { initDatabase } from './db/model'

;

(async () => {
  await initDatabase(process.env.MONGO_URI!)

  const app = fastify({
    logger:
      process.env.NODE_ENV === 'development'
        ? {
            prettyPrint: true
          }
        : true
  })

  const port = parseInt(process.env.PORT || '8080')

  app.register(helmet)

  if (process.env.NODE_ENV === 'development') {
    app.addHook('preHandler', async (req) => {
      if (req.body) {
        req.log.info({ body: req.body }, 'body')
      }
    })
  }

  app.register(router, { prefix: '/api' })

  app.register(fastifyStatic, {
    root: path.resolve('public')
  })

  app.setNotFoundHandler((_, reply) => {
    reply.status(200).sendFile('200.html')
  })

  app.listen(
    port,
    process.env.NODE_ENV === 'development' ? 'localhost' : '0.0.0.0',
    (err) => {
      if (err) {
        throw err
      }

      console.log(`Go to http://localhost:${port}`)
    }
  )
})().catch(console.error)
