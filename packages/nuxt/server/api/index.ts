import fs from 'fs'
import os from 'os'
import path from 'path'

import axios from 'axios'
import connectMongo from 'connect-mongo'
import { Router } from 'express'
import session from 'express-session'
import admin from 'firebase-admin'
import { Ulid } from 'id128'
import mongoose from 'mongoose'

import { UserModel } from '../db/mongo'
import noteRouter from './note'
import presetRouter from './preset'
import quizRouter from './quiz'
import userRouter from './user'

declare module 'express-session' {
  interface SessionData {
    userId: string
  }
}

export const apiRouter = Router()

let isFirebase = false

if (process.env.FIREBASE_SDK && process.env.FIREBASE_CONFIG) {
  const config = JSON.parse(process.env.FIREBASE_CONFIG)
  admin.initializeApp({
    ...config,
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SDK)),
  })

  isFirebase = true
}

const MongoStore = connectMongo(session)

apiRouter.use(
  session({
    secret: process.env.SECRET!,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
)

apiRouter.use((req, _, next) => {
  const { select } = req.query || {}

  if (typeof select === 'string') {
    req.query.select = select.split(/,/g)
  }

  next()
})

apiRouter.use(async (req, res, next) => {
  const authenticate = async (): Promise<boolean> => {
    if (
      req.url &&
      (req.url.startsWith('/api/doc') ||
        req.url.startsWith('/api/firebase.config.js'))
    ) {
      return true
    }

    let userId: string | undefined

    if (process.env.DEFAULT_USER) {
      const email = process.env.DEFAULT_USER

      userId = await UserModel.findOne({ email })
        .then(
          (u) =>
            u ||
            UserModel.create({
              email,
              name: email.replace(/@.+$/, ''),
              image: 'https://www.gravatar.com/avatar/0?d=mp',
            })
        )
        .then((u) => u._id)

      req.session.userId = userId
      return true
    }

    const { authorization } = req.headers

    if (!authorization) {
      return false
    }

    const isBasic = async () => {
      const m = /^Basic (.+)$/.exec(authorization)

      if (!m) {
        return
      }

      const credentials = Buffer.from(m[1], 'base64').toString()
      const [email, apiKey] = credentials.split(':')
      if (!apiKey) {
        return false
      }

      return UserModel.findOne({
        email,
        apiKey,
      }).then((u) => u?._id)
    }

    const isBearer = async () => {
      if (!isFirebase) {
        return
      }

      const m = /^Bearer (.+)$/.exec(authorization)

      if (!m) {
        return
      }

      const ticket = await admin.auth().verifyIdToken(m[1], true)
      const userId = req.session.userId
      if (userId) {
        return userId
      }

      if (ticket.email) {
        const email = ticket.email
        return await UserModel.findOne({ email })
          .then(async (u) => {
            if (u) {
              return u
            }

            let image = 'https://www.gravatar.com/avatar/0?d=mp'
            if (ticket.picture) {
              const tmpDir = path.join(os.tmpdir(), 'rep2recall')
              try {
                fs.mkdirSync(tmpDir)
              } catch (_) {}

              const filePath = path.join(
                tmpDir,
                Ulid.generate().toCanonical() + '.png'
              )
              fs.writeFileSync(
                filePath,
                await axios.get(ticket.picture).then((r) => r.data)
              )

              const [f] = await admin.storage().bucket().upload(filePath)
              await f.makePublic()
              image = f.metadata.mediaLink
            }

            return UserModel.create({
              email,
              name: ticket.name,
              image,
            })
          })
          .then((u) => u._id as string)
      }
    }

    userId = (await isBasic()) || (await isBearer())

    if (userId) {
      req.session.userId = userId
      return true
    }

    return false
  }

  try {
    if (await authenticate()) {
      next()
    } else {
      res.sendStatus(401)
    }
  } catch (e) {
    next(e)
  }
})

apiRouter.use('/note', noteRouter)
apiRouter.use('/preset', presetRouter)
apiRouter.use('/quiz', quizRouter)
apiRouter.use('/user', userRouter)
