import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import { Router } from 'express'

dotenv.config()

export const router = Router()
router.use(bodyParser.json())

router.get('/firebase-config.json', (_, res) => {
  res.json(JSON.parse(process.env.FIREBASE_CONFIG!))
})
