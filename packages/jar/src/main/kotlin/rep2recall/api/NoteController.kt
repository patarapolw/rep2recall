package rep2recall.api

import com.github.salomonbrys.kotson.fromJson
import com.google.gson.JsonNull
import io.javalin.apibuilder.EndpointGroup
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context
import io.javalin.plugin.openapi.annotations.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import org.joda.time.DateTime
import rep2recall.db.*

object NoteController {
    val handler = EndpointGroup {
        get(this::getOne)
        get("attr", this::getAttr)
        post("q", this::query)
        put(this::create)
        patch(this::update)
        delete(this::delete)
    }

    @OpenApi(
            tags = ["note"],
            summary = "Get a Note",
            queryParams = [
                OpenApiParam("select", String::class, required = true,
                        description = "Comma (,) separated fields"),
                OpenApiParam("uid", String::class, required = true)
            ],
            responses = [
                OpenApiResponse("200", [OpenApiContent(NotePartialSer::class)]),
                OpenApiResponse("400", [OpenApiContent(StdErrorResponse::class)])
            ]
    )
    private fun getOne(ctx: Context) {
        val select = ctx.queryParam<String>("select").get()
                .split(",")
                .toSet()

        transaction {
            Note.find {
                NoteTable.userId eq ctx.sessionAttribute<String>("userId") and
                        (NoteTable.uid eq ctx.queryParam<String>("uid").get())
            }.firstOrNull()?.let {
                ctx.json(it.filterKey(select))
            }
        } ?: ctx.status(400).json(StdErrorResponse("not found"))
    }

    @OpenApi(
            tags = ["note"],
            summary = "Get a Note Attribute value",
            queryParams = [
                OpenApiParam("uid", String::class, required = true),
                OpenApiParam("attr", String::class, required = true)
            ],
            responses = [
                OpenApiResponse("200", [OpenApiContent(StdSuccessResponse::class)]),
                OpenApiResponse("400", [OpenApiContent(StdErrorResponse::class)])
            ]
    )
    private fun getAttr(ctx: Context) {
        val uid = ctx.queryParam<String>("uid").get()
        val attr = ctx.queryParam<String>("attr").get()

        transaction {
            NoteAttrTable.innerJoin(NoteTable).select {
                (NoteAttrTable.key eq attr) and (NoteTable.uid eq uid)
            }.firstOrNull()?.let {
                ctx.json(StdSuccessResponse(
                        NoteAttr.wrapRow(it).value
                ))
            }
        } ?: ctx.status(400).json(StdErrorResponse("not found"))
    }

    @OpenApi(
            tags = ["note"],
            summary = "Query for Notes",
            requestBody = OpenApiRequestBody([OpenApiContent(QueryRequest::class)]),
            responses = [
                OpenApiResponse("200", [OpenApiContent(NoteQueryResponse::class)])
            ]
    )
    private fun query(ctx: Context) {
        val body = ctx.body<QueryRequest>()

        val sortBy = body.sortBy ?: "id"
        var desc = body.desc ?: false

        if (body.sortBy == null && body.desc == null) {
            desc = true
        }

        transaction {
            var q = getSearchQuery(
                    ctx.sessionAttribute<String>("userId")!!,
                    body.q
            )

            val count = q.count()

            q = q.orderBy(
                    when (sortBy) {
                        "updatedAt" -> NoteTable.updatedAt
                        else -> NoteTable.id
                    } to (if (desc) SortOrder.DESC else SortOrder.ASC)
            )

            body.limit?.let {
                q = q.limit(it, body.offset)
            }

            ctx.json(mapOf(
                    "result" to q.map { Note.wrapRow(it).filterKey(body.select.toSet()) },
                    "count" to count
            ))
        }
    }

    @OpenApi(
            tags = ["note"],
            summary = "Create a Note",
            requestBody = OpenApiRequestBody([OpenApiContent(NoteSer::class)]),
            responses = [
                OpenApiResponse("201", [OpenApiContent(CreateResponse::class)])
            ]
    )
    private fun create(ctx: Context) {
        val body = ctx.bodyValidator<NoteSer>().get()

        val n = transaction {
            Note.create(
                    User.findById(ctx.sessionAttribute<String>("userId")!!)!!,
                    body
            )
        }

        ctx.status(201).json(CreateResponse(n.id.value))
    }

    @OpenApi(
            tags = ["note"],
            summary = "Update a Note",
            queryParams = [
                OpenApiParam("uid", String::class, required = true)
            ],
            requestBody = OpenApiRequestBody([OpenApiContent(NotePartialSer::class)]),
            responses = [
                OpenApiResponse("201", [OpenApiContent(StdSuccessResponse::class)]),
                OpenApiResponse("304", [OpenApiContent(StdErrorResponse::class)])
            ]
    )
    private fun update(ctx: Context) {
        val body = ctx.body<Map<String, Any>>()

        transaction {
            Note.find {
                NoteTable.userId eq ctx.sessionAttribute<String>("userId") and
                        (NoteTable.uid eq ctx.queryParam<String>("uid").get())
            }.firstOrNull()?.let { n ->
                n.updatedAt = DateTime.now()

                body["nextReview"]?.let {
                    n.nextReview = if (it is JsonNull) {
                        null
                    } else DateTime.parse(gson.fromJson(gson.toJson(it)))
                }

                body["lastRight"]?.let {
                    n.lastRight = if (it is JsonNull) {
                        null
                    } else DateTime.parse(gson.fromJson(gson.toJson(it)))
                }

                body["lastWrong"]?.let {
                    n.lastWrong = if (it is JsonNull) {
                        null
                    } else DateTime.parse(gson.fromJson(gson.toJson(it)))
                }

                body["uid"]?.let {
                    n.uid = gson.fromJson(gson.toJson(it))
                }

                body["deck"]?.let {
                    n.deck = gson.fromJson(gson.toJson(it))
                }

                body["front"]?.let {
                    n.front = gson.fromJson(gson.toJson(it))
                }

                body["back"]?.let {
                    n.back = gson.fromJson(gson.toJson(it))
                }

                body["mnemonic"]?.let {
                    n.mnemonic = gson.fromJson(gson.toJson(it))
                }

                body["srsLevel"]?.let {
                    n.srsLevel = gson.fromJson(gson.toJson(it))
                }

                body["rightStreak"]?.let {
                    n.rightStreak = gson.fromJson(gson.toJson(it))
                }

                body["wrongStreak"]?.let {
                    n.wrongStreak = gson.fromJson(gson.toJson(it))
                }

                body["maxRight"]?.let {
                    n.maxRight = gson.fromJson(gson.toJson(it))
                }

                body["maxWrong"]?.let {
                    n.maxWrong = gson.fromJson(gson.toJson(it))
                }

                body["data"]?.let {
                    n.data = gson.fromJson(gson.toJson(it))
                }

                body["attr"]?.let {
                    val data = gson.fromJson<List<NoteAttrSer>>(gson.toJson(it))
                    val oldItems = n.attr.toMutableList()

                    for (a in data) {
                        var isNew = true
                        for (item in oldItems) {
                            if (a.key == item.key) {
                                item.value = a.value
                                oldItems.remove(item)
                                isNew = false
                                break
                            }
                        }

                        if (isNew) {
                            NoteAttr.create(a.key, a.value, n)
                        }
                    }

                    for (item in oldItems) {
                        item.delete()
                    }

                }

                body["tag"]?.let {
                    User.findById(ctx.sessionAttribute<String>("userId")!!)?.let { u ->
                        val tags = gson.fromJson<List<String>>(gson.toJson(it))
                        n.tag = SizedCollection(tags.map { t ->
                            Tag.upsert(u, t)
                        })
                    }
                }

                ctx.status(201).json(mapOf(
                        "result" to "updated"
                ))
            }
        } ?: ctx.status(304).json(mapOf(
                "error" to "not found"
        ))
    }

    @OpenApi(
            tags = ["note"],
            summary = "Delete a Note",
            queryParams = [
                OpenApiParam("uid", String::class, required = true)
            ],
            responses = [
                OpenApiResponse("201", [OpenApiContent(StdSuccessResponse::class)]),
                OpenApiResponse("304", [OpenApiContent(StdErrorResponse::class)])
            ]
    )
    private fun delete(ctx: Context) {
        transaction {
            Note.find {
                NoteTable.userId eq ctx.sessionAttribute<String>("userId") and
                        (NoteTable.uid eq ctx.queryParam<String>("uid").get())
            }.firstOrNull()?.let {
                it.delete()

                ctx.status(201).json(StdSuccessResponse("deleted"))
            }
        } ?: ctx.status(304).json(StdErrorResponse("not found"))
    }
}