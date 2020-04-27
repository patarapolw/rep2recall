import { FastifyInstance } from 'fastify'
import swagger from 'fastify-oas'
import fSession from 'fastify-session'
import fCoookie from 'fastify-cookie'
import admin from 'firebase-admin'

import editRouter from './edit'
import quizRouter from './quiz'
import { db } from '../db/schema'

const router = (f: FastifyInstance, opts: any, next: () => void) => {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SDK!)),
    databaseURL: 'https://rep2recall.firebaseio.com'
  })

  f.register(swagger, {
    routePrefix: '/doc',
    swagger: {
      info: {
        title: 'Rep2Recall API',
        description: 'Rep2Recall Swagger API',
        version: '0.1.0'
      },
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'edit', description: 'Editing related endpoints' },
        { name: 'quiz', description: 'Quizzing related endpoints' }
      ],
      components: {
        securitySchemes: {
          BasicAuth: {
            type: 'http',
            scheme: 'basic'
          }
        }
      }
    },
    exposeRoute: true
  })

  f.register(fCoookie)
  f.register(fSession, { secret: process.env.SECRET! })

  f.addHook('preHandler', async (req, reply) => {
    if (process.env.NODE_ENV === 'development' && process.env.DEFAULT_USER) {
      await db.signIn(process.env.DEFAULT_USER)
      return
    }

    if (req.req.url && req.req.url.startsWith('/api/doc')) {
      return
    }

    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')

    if (!m) {
      reply.status(401).send()
      return
    }

    const ticket = await admin.auth().verifyIdToken(m[1], true)

    req.session.user = ticket
    if (!db.user) {
      await db.signIn(ticket.email)
    }
  })

  f.register(editRouter, { prefix: '/edit' })
  f.register(quizRouter, { prefix: '/quiz' })
  next()
}

export default router
