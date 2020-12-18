<template>
  <v-container class="Quiz">
    <v-dialog v-model="isSaveNameDialog" max-width="300px">
      <v-card>
        <v-card-text class="pt-4 pb-0">
          <v-text-field v-model="saveName" label="Preset name" required />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="!saveName" @click="doSaveConfirm">Save</v-btn>
          <v-btn text @click.stop="isSaveNameDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="isSaveConfirmDialog" max-width="300px">
      <v-card>
        <v-card-title>
          <span style="word-break: break-word">
            Do you want to overwrite the previous preset with the same name?
          </span>
        </v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="doSaveUpdate">Yes</v-btn>
          <v-btn text @click.stop="isSaveConfirmDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="isQuizDialog"
      max-width="800"
      @input="() => (isQuizDialog ? null : doFilter())"
    >
      <v-card>
        <v-card-text class="pt-4">
          <iframe
            v-if="quizCurrent"
            frameborder="0"
            :srcdoc="iframeContent"
          ></iframe>
          <div v-else-if="quizIds.length">
            <p>
              Number of quizzes to go: {{ quizIds.length.toLocaleString() }}
            </p>
            <p>💪 Good luck!</p>
          </div>
          <div v-else>
            <p>😁 Quizzes are done!</p>
          </div>
        </v-card-text>

        <v-card-action>
          <div v-if="quizCurrent && isQuizAnswerShown" class="button-grid">
            <v-btn text color="green" @click="markQuiz('right')"> Right </v-btn>
            <v-btn text color="red" @click="markQuiz('wrong')"> Wrong </v-btn>
            <v-btn text color="blue" @click="markQuiz('repeat')">
              Repeat
            </v-btn>
            <v-btn text color="orange" disabled> Edit </v-btn>
            <v-btn text @click="isQuizAnswerShown = false"> Hide answer </v-btn>
          </div>

          <div v-else-if="quizCurrent" class="button-grid">
            <v-btn text @click="isQuizAnswerShown = true"> Show answer </v-btn>
          </div>

          <div v-else-if="quizIds.length" class="button-grid">
            <v-btn text @click="nextQuiz"> Begin </v-btn>
          </div>

          <div v-else class="button-grid">
            <v-btn text @click="isQuizDialog = false"> End quiz </v-btn>
          </div>
        </v-card-action>
      </v-card>
    </v-dialog>

    <v-card class="mx-4 mb-4">
      <div class="d-flex flex-row align-center mx-4 flex-wrap">
        <v-switch v-model="status.new" label="New" />
        <v-switch v-model="status.leech" label="Leech" />
        <v-switch v-model="status.graduated" label="Graduated" />
        <v-switch v-model="status.due" label="Due-only" />
        <div class="flex-grow-1"></div>
        <v-overflow-btn
          class="v-input--is-focused"
          :value="quizActions[0].text"
          :items="quizActions"
          segmented
          color="light"
          :disabled="!itemSelected.length || !quizIds.length"
        />
      </div>
    </v-card>

    <div>
      <v-treeview
        v-model="itemSelected"
        :items="treeview"
        :open.sync="itemOpened"
        selectable
        dense
      >
        <template #append="{ item, open }">
          <div v-if="!item.children || !open">
            <div data-quiz="new">
              {{ item.new.toLocaleString() }}
            </div>
            <div data-quiz="due">
              {{ item.due.toLocaleString() }}
            </div>
            <div data-quiz="leech">
              {{ item.leech.toLocaleString() }}
            </div>
          </div>
        </template>
      </v-treeview>
    </div>
  </v-container>
</template>

<script lang="ts">
import { IStatus } from '~/store'
import ejs from 'ejs'
import { Component, Vue } from 'nuxt-property-decorator'

type ITreeview<T> = {
  id: string
  name: string
  children?: ITreeview<T>[]
} & T

interface IQuizData {
  deck: string[]
  new: number
  due: number
  leech: number
}

// eslint-disable-next-line no-use-before-define
@Component<QuizPage>({
  layout: 'logged-in',
  watch: {
    itemSelected: {
      deep: true,
      handler() {
        this.saveState()
      },
    },
    itemOpened: {
      deep: true,
      handler() {
        this.saveState()
      },
    },
    status: {
      deep: true,
      handler() {
        this.saveState()
      },
    },
    '$route.query.id'() {
      this.loadState()
    },
    '$store.state.q'() {
      this.doFilter()
    },
  },
  created() {
    this.loadState()
  },
})
export default class QuizPage extends Vue {
  itemSelected = ['']
  itemOpened = ['']

  status: IStatus = {
    new: true,
    due: true,
    leech: true,
    graduated: false,
  }

  treeviewData: IQuizData[] = []

  quizData: Record<
    string,
    {
      front?: string
      back?: string
      attr?: Record<string, string>
      data?: Record<string, unknown>
    }
  > = {}

  quizIds: string[] = []
  quizIndex = -1
  isQuizDialog = false
  isQuizAnswerShown = false

  isSaveNameDialog = false
  isSaveConfirmDialog = false
  saveName = ''

  quizActions = [
    { text: 'Start quiz', callback: () => this.startQuiz() },
    {
      text: 'Save',
      callback: () => this.openSaveNameDialog(),
    },
    { text: 'Export', callback: () => this.exportQuiz(), disabled: true },
  ]

  ejsContext = {
    $: async (quizId: string, field: 'front' | 'back' | 'data' | 'attr') => {
      this.$set(this.quizData, quizId, this.quizData[quizId] || {})

      if (typeof this.quizData[quizId][field] !== 'undefined') {
        return this.quizData[quizId][field]
      }

      try {
        await this.cacheContent(quizId, [field])
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e)
      }

      return this.quizData[quizId][field]
    },
    $$: async (quizId: string, attr: string) => {
      if (typeof (this.quizData[quizId]?.attr || {})[attr] !== 'undefined') {
        return (this.quizData[quizId].attr || {})[attr]
      }

      const { data } = await this.$axios.get<{
        result?: string
      }>('/api/note/attr', {
        params: {
          uid: quizId,
          attr,
        },
      })

      this.$set(this.quizData, quizId, this.quizData[quizId] || {})
      this.$set(this.quizData[quizId], 'attr', this.quizData[quizId].attr || {})
      this.$set(this.quizData[quizId].attr || {}, attr, data.result)

      return data.result
    },
  }

  get treeview(): ITreeview<{
    new: number
    due: number
    leech: number
  }>[] {
    const recurseTreeview = (
      c: IQuizData[],
      parent: string[]
    ): this['treeview'] => {
      const subset = c.filter((c0) => {
        const isChild: boolean[] = []
        parent.map((p, i) => {
          return isChild.push(c0.deck[i] === p)
        })

        return isChild.length > 0 ? isChild.every((t) => t) : true
      })

      const sMap = new Map<string, IQuizData[]>()

      if (subset.length === 0) {
        sMap.set(parent.join('\x1F'), [
          {
            deck: parent,
            new: 0,
            due: 0,
            leech: 0,
          },
        ])
      } else {
        for (const s of subset) {
          const id = s.deck.slice(0, parent.length + 1).join('\x1F')

          const prev = sMap.get(id)
          if (prev) {
            prev.push(s)
            sMap.set(id, prev)
          } else {
            sMap.set(id, [s])
          }
        }
      }

      return Array.from(sMap).map(([k, vs]) => {
        return {
          id: k,
          name: vs[0].deck[parent.length],
          new: vs.reduce((prev, v) => prev + v.new, 0),
          due: vs.reduce((prev, v) => prev + v.due, 0),
          leech: vs.reduce((prev, v) => prev + v.leech, 0),
          children:
            vs[0].deck.length > parent.length + 1
              ? recurseTreeview(vs, vs[0].deck.slice(0, parent.length + 1))
              : undefined,
        }
      })
    }

    return [
      {
        id: '',
        name: 'All quizzes',
        new: 0,
        due: 0,
        leech: 0,
        children: this.treeviewData.length
          ? recurseTreeview(this.treeviewData, [])
          : undefined,
      },
    ]
  }

  get quizCurrent() {
    const r = this.quizIds[this.quizIndex]

    if (!r) {
      return null
    }

    return r
  }

  get iframeContent() {
    if (!this.quizCurrent || !this.quizData[this.quizCurrent]) {
      return ''
    }

    return (
      (this.isQuizAnswerShown
        ? this.quizData[this.quizCurrent].back
        : this.quizData[this.quizCurrent].front) || ''
    )
  }

  startQuiz() {
    this.quizIds.slice(0, 3).map((id) => this.cacheContent(id))
    this.quizIndex = -1
    this.isQuizDialog = true
  }

  nextQuiz() {
    this.quizIndex++
    this.quizIds
      .slice(this.quizIndex, this.quizIndex + 3)
      .map((id) => this.cacheContent(id))
  }

  async markQuiz(as: 'right' | 'wrong' | 'repeat') {
    if (!this.quizCurrent) {
      return
    }

    await this.$axios.patch('/api/quiz/mark', undefined, {
      params: {
        uid: this.quizCurrent,
        as,
      },
    })

    this.nextQuiz()
  }

  async cacheContent(
    quizId?: string,
    fields = ['front', 'back', 'attr', 'data']
  ) {
    if (!quizId) {
      return
    }

    this.$set(this.quizData, quizId, this.quizData[quizId] || {})

    const fieldSet = new Set(fields)
    fields.forEach((f) => {
      if (f === 'attr') {
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (this.quizData[quizId] as any)[f] !== 'undefined') {
        fieldSet.delete(f)
      }
    })

    const { data } = await this.$axios.get<{
      front?: string
      back?: string
      attr?: {
        key: string
        value: string
      }[]
      data?: Record<string, unknown>
    }>('/api/note', {
      params: {
        uid: quizId,
        select: Array.from(fieldSet).join(','),
      },
    })

    const attr = data.attr
      ? data.attr.reduce(
          (prev, it) => ({
            ...prev,
            [it.key]: it.value,
          }),
          {} as Record<string, string>
        )
      : {}

    const ctx = {
      ...this.ejsContext,
      attr,
      data: data.data,
    }

    this.$set(this.quizData[quizId], 'attr', attr)
    this.$set(this.quizData[quizId], 'data', data.data)

    await Promise.all([
      ejs.render(data.front || '', ctx, { async: true }).then((r) => {
        this.$set(this.quizData[quizId], 'front', r)
      }),
      ejs.render(data.back || '', ctx, { async: true }).then((r) => {
        this.$set(this.quizData[quizId], 'back', r)
      }),
    ])
  }

  async exportQuiz() {
    alert('Exporting quiz')
  }

  openSaveNameDialog() {
    this.saveName = new Date().toLocaleString()
    this.isSaveNameDialog = true
  }

  async doSaveConfirm() {
    if (this.$accessor.hasTag(this.saveName)) {
      this.isSaveConfirmDialog = true
    } else {
      const { data } = await this.$axios.put<{
        id: string
      }>('/api/preset', {
        q: this.$accessor.q,
        name: this.saveName,
        selected: this.itemSelected,
        opened: this.itemOpened,
        status: this.status,
      })

      this.$accessor.UPDATE_TAGS({
        id: data.id,
        q: this.$accessor.q,
        name: this.saveName,
        selected: this.itemSelected,
        opened: this.itemOpened,
        status: this.status,
        canDelete: true,
      })

      this.$router.push({
        path: '/quiz',
        query: {
          id: data.id,
        },
      })

      this.isSaveNameDialog = false
    }
  }

  async doSaveUpdate() {
    await this.$axios.patch(
      '/api/preset',
      {
        q: this.$accessor.q,
        selected: this.itemSelected,
        opened: this.itemOpened,
        status: this.status,
      },
      {
        params: {
          id: this.$route.query.id,
        },
      }
    )

    this.$accessor.UPDATE_TAGS({
      id: this.$route.query.id as string,
      name: this.saveName,
      q: this.$accessor.q,
      status: this.status,
      canDelete: true,
      selected: this.itemSelected,
      opened: this.itemOpened,
    })

    this.isSaveNameDialog = false
    this.isSaveConfirmDialog = false
  }

  async loadState() {
    try {
      const { data } = await this.$axios.get<{
        q: string
        name: string
        selected: string[]
        opened: string[]
        status: IStatus
      }>('/api/preset', {
        params: {
          id: this.$route.query.id,
          select: 'q,name,selected,opened,status',
        },
      })

      this.$accessor.UPDATE_Q(data.q)
      this.saveName = data.name
      this.itemSelected = data.selected
      this.itemOpened = data.opened
      this.status = data.status

      this.doFilter()
    } catch (_) {}
  }

  async saveState() {
    /**
     * Do not await
     */
    this.$axios.patch(
      '/api/preset',
      {
        q: this.$accessor.q,
        selected: this.itemSelected,
        opened: this.itemOpened,
        status: this.status,
      },
      {
        params: {
          id: this.$route.query.id,
        },
      }
    )

    const { data } = await this.$axios.post<{
      result: string[]
    }>('/api/quiz', {
      decks: this.itemSelected,
      q: this.$accessor.q,
      status: this.status,
    })

    this.quizIds = data.result
  }

  _doFilterTimeout: number | null = null

  doFilter() {
    if (typeof this._doFilterTimeout === 'number') {
      clearTimeout(this._doFilterTimeout)
    }

    this._doFilterTimeout = window.setTimeout(async () => {
      const { data } = await this.$axios.post<{
        result: IQuizData[]
      }>('/api/quiz/treeview', {
        q: this.$accessor.q,
        status: this.status,
      })

      this.treeviewData = data.result
      this.saveState()
    }, 500)
  }
}
</script>

<style lang="scss" scoped>
.Quiz {
  ::v-deep {
    .v-treeview-node__append {
      display: flex;
      flex-direction: row;

      [data-quiz] {
        display: inline-block;
        min-width: 3em;
        text-align: right;
        margin-left: 0.5em;
      }

      [data-quiz='new'] {
        color: green;
      }

      [data-quiz='due'] {
        color: blue;
      }

      [data-quiz='leech'] {
        color: red;
      }
    }
  }
}

.v-input--switch {
  margin-right: 2em;

  @media screen and (max-width: 800px) {
    width: 120px;
  }
}

.v-overflow-btn {
  flex-grow: 0;
  margin-right: 1rem;
  padding-top: 12px;

  @media screen and (max-width: 550px) {
    margin: 0 auto;
  }

  ::v-deep {
    .v-input__slot {
      width: 200px;
    }

    .v-btn__content {
      justify-content: center;
    }
  }
}

iframe {
  height: 70vh;
}

.button-grid {
  width: 100%;
  text-align: center;

  .v-btn {
    margin-bottom: 0.5rem;
  }

  .v-btn + .v-btn {
    margin-left: 0.5rem;
  }
}
</style>
