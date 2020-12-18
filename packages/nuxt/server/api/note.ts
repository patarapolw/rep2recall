import { Router } from 'express'
import S from 'jsonschema-definer'

import { NoteAttrModel, NoteModel } from '../db/mongo'
import { IError, ISuccess, validate } from '../types'

const f = Router()

const sNoteShape = {
  uid: S.string().optional(),
  deck: S.string().optional(),
  front: S.string().optional(),
  back: S.string().optional(),
  mnemonic: S.string().optional(),
  data: S.object().additionalProperties(true),
  tag: S.list(S.string()).optional(),
  srsLevel: S.integer().optional(),
  nextReview: S.string().format('date-time').optional(),
  lastRight: S.string().format('date-time').optional(),
  lastWrong: S.string().format('date-time').optional(),
  rightStreak: S.integer().optional(),
  wrongStreak: S.integer().optional(),
  maxRight: S.integer().optional(),
  maxWrong: S.integer().optional(),
  createdAt: S.string().format('date-time').optional(),
  updatedAt: S.string().format('date-time').optional(),
  attr: S.list(
    S.shape({
      key: S.string(),
      value: S.string(),
    })
  ).optional(),
}
const sNote = S.shape(sNoteShape)

getOne()
getAttr()
query()
create()
update()
deleteOne()

/**
 * GET /
 */
function getOne() {
  const sQuerystring = S.shape({
    select: S.list(S.string().enum(...Object.keys(sNoteShape))),
    uid: S.string(),
  })

  const sResponse = sNote

  f.get<never, typeof sResponse.type | IError, never, typeof sQuerystring.type>(
    '/',
    validate({
      query: sQuerystring.valueOf,
    }),
    async (req, res, next): Promise<void> => {
      try {
        const userId = req.session.userId
        if (!userId) {
          res.status(401)
          res.status(401).json({
            error: 'User not found',
          })
          return
        }

        const r = await NoteModel.findOne({ userId, uid: req.query.uid })

        if (r) {
          res.json(
            req.query.select.reduce(
              (prev, c) => ({
                ...prev,
                [c]: (r as Record<string, any>)[c],
              }),
              {
                attr: req.query.select.includes('attr')
                  ? await NoteAttrModel.find({ note: r }).then((ps) =>
                      ps.map((p) => ({
                        key: p.key,
                        value: p.value,
                      }))
                    )
                  : undefined,
              } as typeof sResponse.type
            )
          )
          return
        }

        res.status(404).json({
          error: 'Note not found',
        })
      } catch (e) {
        next(e)
      }
    }
  )
}

/**
 * GET /attr
 */
function getAttr() {
  const sQuerystring = S.shape({
    uid: S.string(),
    attr: S.string(),
  })

  f.get<never, ISuccess | IError, never, typeof sQuerystring.type>(
    '/attr',
    validate({
      query: sQuerystring.valueOf,
    }),
    async (req, res, next): Promise<void> => {
      try {
        const userId = req.session.userId
        if (!userId) {
          res.status(401).json({
            error: 'User not found',
          })
          return
        }

        const r = await NoteModel.findOne({ userId, uid: req.query.uid })
        if (!r) {
          res.status(404).json({
            error: 'Note not found',
          })
          return
        }

        const a = await NoteAttrModel.findOne({ note: r, key: req.query.attr })
        if (!a) {
          res.status(404).json({
            error: 'NoteAttr not found',
          })
          return
        }

        res.json({
          result: a.value,
        })
      } catch (e) {
        next(e)
      }
    }
  )
}

/**
 * POST /q
 */
function query() {
  const sBody = S.shape({
    select: S.list(S.string().enum(...Object.keys(sNoteShape))),
    q: S.string().optional(),
    offset: S.integer().optional(),
    limit: S.integer().optional(),
    sortBy: S.string().optional(),
    desc: S.boolean().optional(),
  })

  const sResponse = S.shape({
    result: S.list(sNote),
    count: S.integer(),
  })

  f.post<never, typeof sResponse.type | IError, typeof sBody.type>(
    '/q',
    validate({
      body: sBody.valueOf,
    }),
    async (req, res, next): Promise<void> => {
      try {
        const userId = req.session.userId
        if (!userId) {
          res.status(401).json({
            error: 'User not found',
          })
          return
        }

        const { select, q = '', offset = 0, limit } = req.body
        let { sortBy = 'updatedAt', desc = false } = req.body

        if (!req.body.sortBy && typeof req.body.desc === 'undefined') {
          sortBy = 'updatedAt'
          desc = true
        }

        const rs = await NoteModel.search(q, {
          userId,
          isJoinNoteAttr: select.includes('attr'),
          post: [
            {
              $facet: {
                result: [
                  { $sort: { [sortBy]: desc ? -1 : 1 } },
                  ...(limit ? [{ $skip: offset }, { $limit: limit }] : []),
                  {
                    $project: select.reduce(
                      (prev, k) => ({
                        ...prev,
                        [k]: 1,
                      }),
                      {
                        _id: 0,
                      } as Record<string, number>
                    ),
                  },
                ],
                count: [{ $count: 'count' }],
              },
            },
          ],
        })

        res.json({
          result: rs[0]?.result || [],
          count: rs[0]?.count[0]?.count || 0,
        })
      } catch (e) {
        next(e)
      }
    }
  )
}

/**
 * PUT /
 */
function create() {
  const sBody = sNote

  const sResponse = S.shape({
    uid: S.string(),
  })

  f.put<never, typeof sResponse.type | IError, typeof sBody.type>(
    '/',
    validate({
      body: sBody.valueOf,
    }),
    async (req, res, next): Promise<void> => {
      try {
        const userId = req.session.userId
        if (!userId) {
          res.status(401).send({
            error: 'User not found',
          })
          return
        }

        const { attr = [], ...body } = req.body

        const r = await NoteModel.create({
          ...body,
          userId,
        })

        await Promise.all(
          attr.map((a) =>
            NoteAttrModel.create({
              ...a,
              noteId: r._id,
            })
          )
        )

        res.status(201).send({
          uid: r.uid!,
        })
      } catch (e) {
        next(e)
      }
    }
  )
}

/**
 * PATCH /
 */
function update() {
  const sQuerystring = S.shape({
    uid: S.string(),
  })
  const sBody = sNote

  f.patch<
    never,
    ISuccess | IError,
    typeof sBody.type,
    typeof sQuerystring.type
  >(
    '/',
    validate({
      query: sQuerystring.valueOf,
      body: sBody.valueOf,
    }),
    async (req, res, next): Promise<void> => {
      try {
        const userId = req.session.userId
        if (!userId) {
          res.status(401).send({
            error: 'User not found',
          })
          return
        }

        const r = await NoteModel.findOne({ userId, uid: req.query.uid })
        if (!r) {
          res.status(404).send({
            error: 'Note not found',
          })
          return
        }

        const { attr, ...body } = req.body

        Object.assign(r, body)

        await Promise.all([
          r.save(),
          (async () => {
            if (attr) {
              const attrMap = new Map<string, string>()
              attr.map((a) => {
                return attrMap.set(a.key, a.value)
              })

              const ps = await NoteAttrModel.find({ note: r })
              const toUpdate: typeof ps[0][] = []
              const toDelete: typeof ps[0][] = []

              // eslint-disable-next-line array-callback-return
              ps.map((p) => {
                const v = attrMap.get(p.key)
                if (typeof v !== 'undefined') {
                  if (v !== p.value) {
                    p.value = v
                    toUpdate.push(p)
                  }
                } else {
                  toDelete.push(p)
                }
              })

              return Promise.all([
                ...toUpdate.map((p) => p.save()),
                ...toDelete.map((p) => p.deleteOne()),
              ])
            }
          })(),
        ])

        res.status(201).send({
          result: 'updated',
        })
      } catch (e) {
        next(e)
      }
    }
  )
}

/**
 * DELETE /
 */
function deleteOne() {
  const sQuerystring = S.shape({
    uid: S.string(),
  })

  f.delete<never, ISuccess | IError, never, typeof sQuerystring.type>(
    '/',
    validate({
      query: sQuerystring.valueOf,
    }),
    async (req, res, next): Promise<void> => {
      try {
        const userId = req.session.userId
        if (!userId) {
          res.status(401).json({
            error: 'User not found',
          })
          return
        }

        const r = await NoteModel.findOne({ userId, uid: req.query.uid })
        if (!r) {
          res.status(404).json({
            error: 'Note not found',
          })
          return
        }

        await r.deleteOne()
        res.status(201).json({
          result: 'deleted',
        })
        return
      } catch (e) {
        next(e)
      }
    }
  )
}

export default f
