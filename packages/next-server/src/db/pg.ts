import crypto from 'crypto'

import { Pool } from 'pg'

import { IStatus } from '../types'
import { getNextReview, srsMap } from './quiz'
import { ISplitOpToken, splitOp } from './tokenize'

class Params {
  map = new Map<number, any>()

  set(o: any): number {
    if (o && typeof o === 'object') {
      // eslint-disable-next-line no-empty
      if (o instanceof Date) {
      } else {
        o = JSON.stringify(o)
      }
    }
    const i = this.map.size + 1
    this.map.set(i, o)
    return i
  }

  arr() {
    return Array.from(this.map)
      .sort(([i1], [i2]) => i1 - i2)
      .map(([, v]) => v)
  }
}

class DbUser {
  constructor(private db: Pool) {}

  newApiKey() {
    return crypto.randomBytes(64).toString('base64').replace(/=+$/, '')
  }
}

class DbNote {
  constructor(private db: Pool) {}

  search(
    q: string,
    {
      userId,
      decks = [],
      status,
      joins = new Set<'tag' | 'noteAttr'>(),
      post
    }: {
      userId: string
      decks?: string[]
      status?: IStatus
      joins: Set<'tag' | 'noteAttr'>
      post: Record<string, Record<string, any>>[]
    }
  ): {
    fragment: string
    params: Params
  } {
    const now = new Date()
    const params = new Params()

    const isDeck = (d: string) => {
      return [
        `"note"."deck" = $${params.set(d)}`,
        `(${[
          `"note"."deck" > $${params.set(d)}||'::'`,
          `"note"."deck" < $${params.set(d)}||':;'`
        ].join(' AND ')})`
      ].join(' OR ')
    }

    let cond = ''

    if (status) {
      const $or: string[] = []

      if (status.new) {
        $or.push('"note"."srsLevel" IS NULL')
      }

      if (status.graduated) {
        $or.push('"note"."srsLevel" IS NOT NULL')
      } else {
        $or.push('"note"."srsLevel" <= 3')
      }

      if (status.leech) {
        $or.push('"note"."srsLevel" = 0', '"note"."wrongStreak" >= 2')
      }

      if (status.due) {
        $or.push(
          '"note"."nextReview" IS NULL',
          '"note"."nextReview" < CURRENT_TIMESTAMP'
        )
      }

      if ($or.length) {
        cond = `(${$or.join(' OR ')})`
      }
    }

    if (decks.length) {
      const $and: string[] = decks.map((d) => isDeck(d))
      if (cond) {
        $and.push(cond)
      }

      cond = $and.join(' AND ')
    }

    const col = {
      map: {
        id: '"note"."shortid"',
        deck: 'deck',
        front: 'front',
        back: 'back',
        mnemonic: 'mnemonic',
        tag: () => {
          joins.add('tag')
          return '"tag"."name"'
        },
        srsLevel: 'srsLevel',
        nextReview: 'nextReview',
        lastRight: 'lastRight',
        lastWrong: 'lastWrong',
        rightStreak: 'rightStreak',
        wrongStreak: 'wrongStreak',
        maxRight: 'maxRight',
        maxWrong: 'maxWrong',
        createdAt: '"note"."createdAt"',
        updatedAt: '"note"."updatedAt"',
        '': () => {
          joins.add('noteAttr')
          return '"noteAttr"."value"'
        }
      } as Record<string, string | (() => string)>,
      get(k: string): string {
        const k0 = this.map[k]
        if (!k0) {
          return ''
        }
        if (typeof k0 === 'function') {
          return k0()
        }
        return k0
      }
    }

    const cmp = {
      _(
        p: ISplitOpToken,
        type: 'string' | 'date' | 'float' | 'integer'
      ): string {
        if (typeof p.k === 'undefined') {
          return this.noKey(p)
        }

        const k = col.get(p.k)

        if (!k) {
          return 'FALSE'
        }

        if (p.v === 'NULL' && ['=', ':'].includes(p.op as string)) {
          return `${k} IS NULL`
        }

        if (type === 'date') {
          let v = now
          try {
            v = new Date(p.v) || now
            if (isNaN(+v)) {
              v = now
            }
          } catch (_) {}

          p.v = v as any
        } else if (type === 'integer') {
          p.v = parseInt(p.v) as any
        } else if (type === 'float') {
          p.v = parseFloat(p.v) as any
        }

        return `${k} ${
          p.op && this.validOp.has(p.op) ? p.op : '='
        } $${params.set(p.v)}`
      },
      anyKey(p: ISplitOpToken): string {
        joins.add('noteAttr')

        const q = this._(
          {
            ...p,
            k: ''
          },
          'string'
        )

        if (p.k) {
          return [`"noteAttr"."key" = $${params.set(p.v)}`, q].join(' AND ')
        }

        return `(${[
          q,
          this._(
            {
              ...p,
              k: 'tag'
            },
            'string'
          )
        ].join(' OR ')})`
      },
      noKey(p: ISplitOpToken) {
        return `(${[isDeck(p.v), this.anyKey(p)].join(' OR ')})`
      },
      validOp: new Set(['>', '>=', '<', '<=', '=', '~'])
    }

    const whenK = (p: ISplitOpToken) => {
      if (!p.k) {
        return cmp.noKey(p)
      }

      if (p.k === 'deck' && p.v === ':') {
        return isDeck(p.v)
      }

      if (['uid', 'tag', 'deck'].includes(p.k)) {
        return cmp._(p, 'string')
      } else if (
        [
          'srsLevel',
          'rightStreak',
          'wrongStreak',
          'maxRight',
          'maxWrong'
        ].includes(p.k)
      ) {
        return cmp._(p, 'integer')
      } else if (['nextReview', 'lastRight', 'lastWrong'].includes(p.k)) {
        return cmp._(p, 'date')
      }

      return cmp.anyKey(p)
    }

    const andOp: ISplitOpToken[] = []
    const orOp: ISplitOpToken[] = []
    const notOp: ISplitOpToken[] = []

    splitOp(q).map((p) => {
      if (p.prefix === '-') {
        notOp.push(p)
        return null
      } else if (p.prefix === '?') {
        orOp.push(p)
        return null
      }
      andOp.push(p)
      return null
    })

    const $and: string[] = andOp.map((p) => whenK(p))

    if (orOp.length) {
      $and.push(`(${orOp.map((p) => whenK(p)).join(' OR ')})`)
    }

    if (notOp.length) {
      $and.push(`NOT ${notOp.map((p) => whenK(p)).join(' AND ')}`)
    }

    cond = [
      `"note"."userId" = $${params.set(userId)}`,
      cond || 'TRUE',
      ...$and
    ].join(' AND ')

    return {
      fragment: /* sql */ `
      FROM "note" n
      ${
        joins.has('tag')
          ? /* sql */ `
      LEFT JOIN "noteTag" nt ON nt.noteId = n.id
      LEFT JOIN "tag" t ON t.id = nt.tagId
      `
          : ''
      }
      ${
        joins.has('noteAttr')
          ? /* sql */ `
      LEFT JOIN "noteAttr" na ON na.noteId = n.id
      `
          : ''
      }
      ${
        joins.size
          ? /* sql */ `
      GROUP BY n.id
      `
          : ''
      }
      `,
      params
    }
  }

  async updateSrsLevel(
    where: {
      uid: string
      userId: string
    },
    dSrsLevel: 1 | -1 | 0
  ) {
    const client = await this.db.connect()

    // eslint-disable-next-line no-new
    new Promise<void>((resolve, reject) => {
      client.query('BEGIN', async (err) => {
        if (err) {
          reject(err)
          return
        }

        try {
          const it: {
            srsLevel?: number
            rightStreak?: number
            wrongStreak?: number
            lastRight?: Date
            lastWrong?: Date
            maxRight?: number
            maxWrong?: number
            nextReview?: Date
          } = (
            await client.query(
              /* sql */ `
          SELECT
            "srsLevel",
            "rightStreak",
            "wrongStreak",
            "lastRight",
            "lastWrong",
            "maxRight",
            "maxWrong"
          FROM "note"
          WHERE "userId" = $2 AND "shortId" = $1
          `,
            [where.uid, where.userId]
            )
          ).rows[0]

          if (!it) {
            reject(new Error('no user found'))
            return
          }

          if (dSrsLevel > 0) {
            it.rightStreak = it.rightStreak || 0
            it.rightStreak++
            it.wrongStreak = 0
            it.lastRight = new Date()

            if (
              typeof it.maxRight === 'undefined' ||
              it.rightStreak > it.maxRight
            ) {
              it.maxRight = it.rightStreak
            }
          } else if (dSrsLevel < 0) {
            it.wrongStreak = it.wrongStreak || 0
            it.wrongStreak++
            it.rightStreak = 0
            it.lastWrong = new Date()

            if (
              typeof it.maxWrong === 'undefined' ||
              it.wrongStreak > it.maxWrong
            ) {
              it.maxWrong = it.wrongStreak
            }
          }

          it.srsLevel = it.srsLevel || 0
          it.srsLevel++

          if (it.srsLevel >= srsMap.length) {
            it.srsLevel = srsMap.length - 1
          }

          if (it.srsLevel < 0) {
            it.srsLevel = 0
          }

          if (dSrsLevel > 0) {
            it.nextReview = getNextReview(it.srsLevel)
          }

          const p = new Params()

          await client.query(
            /* sql */ `
          UPDATE "note"
          SET
            "srsLevel" = $${p.set(it.srsLevel)},
            "rightStreak" = $${p.set(it.rightStreak)},
            "wrongStreak" = $${p.set(it.wrongStreak)},
            "lastRight" = $${p.set(it.lastRight)},
            "lastWrong" = $${p.set(it.lastWrong)}
            "maxRight" = $${p.set(it.maxRight)},
            "maxWrong" = $${p.set(it.maxWrong)},
            "nextReview" = $${p.set(it.nextReview)}
          WHERE "userId" = $${p.set(where.userId)} AND "shortId" = $${p.set(
              where.uid
            )}
          `,
            p.arr()
          )

          await client.query('COMMIT')

          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
  }
}

class Database {
  db = new Pool()

  user = new DbUser(this.db)
  note = new DbNote(this.db)
}

export const db = new Database()
