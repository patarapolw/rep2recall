import 'reflect-metadata'

import { Connection, IDatabaseDriver, MikroORM } from '@mikro-orm/core'

export let orm: MikroORM<IDatabaseDriver<Connection>>

export async function initDatabase() {
  orm = await MikroORM.init({
    entities: ['./lib/entities/**/*.js'], // path to your JS entities (dist), relative to `baseDir`
    entitiesTs: ['./src/entities/**/*.ts'], // path to your TS entities (source), relative to `baseDir`
    dbName: 'rep2recall',
    clientUrl: process.env.DATABASE_URL
  })
}
