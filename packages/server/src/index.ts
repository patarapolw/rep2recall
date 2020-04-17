import path from 'path'

import fastify from 'fastify'
import fastifyStatic from 'fastify-static'
import helmet from 'fastify-helmet'

import router from './router'
import { initDatabase } from './db/schema'

try {
  require('dotenv').config()
} catch (_) {}

(async () => {
  const isLocal = process.env.NODE_ENV === 'development' || !!process.env.IS_LOCAL

  await initDatabase(process.env.MONGO_URI!)

  const app = fastify({
    logger: process.env.NODE_ENV === 'development' ? {
      prettyPrint: true
    } : true
  })

  const port = parseInt(process.env.PORT || '8080')

  app.register(helmet)

  if (isLocal) {
    app.addHook('preHandler', async (req) => {
      if (req.body) {
        req.log.info({ body: req.body }, 'body')
      }
    })
  } else {
    app.addHook('preHandler', async (req, reply) => {
      const isHttps = ((req.headers['x-forwarded-proto'] || '').substring(0, 5) === 'https')
      if (isHttps) {
        return
      }

      const { method, url } = req.req

      if (method && ['GET', 'HEAD'].includes(method)) {
        const host = req.headers.host || req.hostname
        reply.redirect(301, `https://${host}${url}`)
      }
    })
  }

  app.register(router, { prefix: '/api' })

  app.register(fastifyStatic, {
    root: path.resolve('public')
  })

  app.get('*', (req, reply) => {
    reply.sendFile('index.html')
  })

  app.listen(port, isLocal ? 'localhost' : '0.0.0.0', (err) => {
    if (err) {
      throw err
    }
  })
})().catch(console.error)
