import express from 'express'
import morgan from 'morgan'

import { router } from './router'

const app = express()

app.use(morgan('common'))
app.use(router)

app.use((e: Error, _: express.Request, res: express.Response) => {
  // eslint-disable-next-line no-console
  console.error(e)
  res.sendStatus(500)
})

export default app
