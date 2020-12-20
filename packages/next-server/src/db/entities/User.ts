import crypto from 'crypto'

import { Entity, PrimaryKey, Property } from '@mikro-orm/core'

@Entity()
export class User {
  @PrimaryKey({
    columnType: 'uuid',
    defaultRaw: 'gen_random_uuid()'
  })
  id!: string

  @Property({
    unique: true
  })
  email!: string

  @Property()
  name!: string

  @Property()
  image!: string

  @Property()
  apiKey: string = User.newApiKey()

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), nullable: true })
  updatedAt!: Date | null

  static newApiKey() {
    return crypto.randomBytes(64).toString('base64').replace(/=+$/, '')
  }
}
