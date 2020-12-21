import crypto from 'crypto'

import { Entity, PrimaryKey, Property } from '@mikro-orm/core'

@Entity()
export class User {
  // Requires enabling the module via: create extension "uuid-ossp";
  @PrimaryKey({
    columnType: 'uuid',
    defaultRaw: 'uuid_generate_v4()'
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
  createdAt: Date = new Date()

  @Property({
    onUpdate: () => new Date(),
    nullable: true
  })
  updatedAt?: Date

  constructor(it: { email: string; name: string; image: string }) {
    this.email = it.email
    this.name = it.name
    this.image = it.image
  }

  static newApiKey() {
    return crypto.randomBytes(64).toString('base64').replace(/=+$/, '')
  }
}
