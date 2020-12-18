<template>
  <!-- eslint-disable vue/valid-v-slot -->
  <v-container class="Browse">
    <v-row class="nav">
      <v-spacer></v-spacer>
      <v-btn color="white"> New </v-btn>
      <v-overflow-btn
        class="v-input--is-focused"
        :value="batchActions[0].text"
        :items="batchActions"
        segmented
        color="light"
        :disabled="!itemSelected.length"
      />
    </v-row>

    <v-data-table
      v-model="itemSelected"
      class="elevation-1"
      :headers="columns"
      :items="tableData"
      :loading="isLoading"
      :options.sync="dataOptions"
      :server-items-length="count"
      :hide-default-footer="!tableData.length"
      show-select
    >
      <template #item.front="{ item }">
        <iframe
          v-if="$vuetify.breakpoint.mdAndUp"
          :srcdoc="getData(item.key, 'front') || ''"
          frameborder="0"
        ></iframe>
        <div v-else class="scroll">{{ item.front }}</div>
      </template>

      <template #item.back="{ item }">
        <iframe
          v-if="$vuetify.breakpoint.mdAndUp"
          :srcdoc="getData(item.key, 'back') || ''"
          frameborder="0"
        ></iframe>
        <div v-else class="scroll">{{ item.back }}</div>
      </template>

      <template #item.attr="{ item }">
        <div v-if="getData(item.key, 'attr')" class="scroll">
          <pre v-if="$vuetify.breakpoint.mdAndUp">
            <code class="yaml language-yaml">
              {{ yamlDump(getData(item.key, 'attr')) }}
            </code>
          </pre>
          <span v-else> {{ JSON.stringify(getData(item.key, 'attr')) }} </span>
        </div>
      </template>

      <template #item.action="{ item }">
        <v-icon small class="mr-2" @click="doEdit(item.key)">
          mdi-pencil
        </v-icon>
        <v-icon small @click="doDelete(item.key)"> mdi-delete </v-icon>
      </template>
    </v-data-table>
  </v-container>
</template>

<script lang="ts">
import ejs from 'ejs'
import yaml from 'js-yaml'
import { Component, Vue } from 'nuxt-property-decorator'

// eslint-disable-next-line no-use-before-define
@Component<BrowsePage>({
  layout: 'logged-in',
  watch: {
    dataOptions: {
      deep: true,
      handler() {
        this.reload()
      },
    },
  },
  created() {
    this.reload()
  },
})
export default class BrowsePage extends Vue {
  itemSelected = []
  columns = [
    {
      text: 'UID',
      value: 'uid',
      width: 200,
    },
    {
      text: 'Front',
      value: 'front',
      sortable: false,
    },
    {
      text: 'Back',
      value: 'front',
      sortable: false,
    },
    {
      text: 'Attributes',
      value: 'attr',
      sortable: false,
    },
    {
      text: 'Last updated',
      value: 'updatedAt',
      width: 200,
    },
    {
      value: 'action',
      width: 80,
    },
  ]

  tableData: {
    uid: string
    front: string
    back: string
  }[] = []

  quizData: Record<
    string,
    {
      front?: string
      back?: string
      attr?: Record<string, string>
      data?: Record<string, unknown>
    }
  > = {}

  isLoading = false
  dataOptions = {
    sortBy: ['updatedAt'],
    sortDesc: [true],
    page: 1,
    itemsPerPage: 5,
  }

  count = 1

  batchActions = [
    { text: 'Edit', callback: () => this.doBatchEdit() },
    {
      text: 'Delete',
      callback: () => this.doBatchDelete(),
    },
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

  yamlDump(o: unknown) {
    return yaml.safeDump(o)
  }

  getData(uid: string, field: 'front' | 'back' | 'attr') {
    return (this.quizData[uid] || {})[field]
  }

  doBatchEdit() {
    alert('Batch edit')
  }

  doBatchDelete() {
    alert('Batch delete')
  }

  doEdit(it: unknown) {
    alert(JSON.stringify(it))
  }

  doDelete(it: unknown) {
    alert(JSON.stringify(it))
  }

  async reload() {
    this.isLoading = true

    const { data } = await this.$axios.post<{
      result: {
        uid: string
        front?: string
        back?: string
        attr?: {
          key: string
          value: string
        }[]
        data?: Record<string, unknown>
      }[]
      count: number
    }>('/api/note/q', {
      select: ['uid', 'front', 'back', 'attr', 'data'],
      q: this.$accessor.q,
      offset: (this.dataOptions.page - 1) * this.dataOptions.itemsPerPage,
      limit: this.dataOptions.itemsPerPage,
      sortBy: this.dataOptions.sortBy[0],
      desc: this.dataOptions.sortDesc[0],
    })

    this.tableData = data.result.map((d) => {
      this.$set(this.quizData, d.uid, this.quizData[d.uid] || {})

      const attr = d.attr
        ? d.attr.reduce(
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
        data: d.data,
      }

      this.$set(this.quizData[d.uid], 'attr', attr)
      this.$set(this.quizData[d.uid], 'data', d.data)

      Promise.all([
        ejs.render(d.front || '', ctx, { async: true }).then((r) => {
          this.$set(this.quizData[d.uid], 'front', r)
        }),
        ejs.render(d.back || '', ctx, { async: true }).then((r) => {
          this.$set(this.quizData[d.uid], 'back', r)
        }),
      ])

      return {
        uid: d.uid,
        front: d.front || '',
        back: d.back || '',
      }
    })

    this.isLoading = false
  }
}
</script>

<style lang="scss" scoped>
.Browse {
  .nav {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;

    .v-btn {
      width: 120px;
      height: 50px;
    }

    .v-overflow-btn {
      flex-grow: 0;
      margin-left: 30px;
      padding-top: 12px;

      ::v-deep {
        .v-input__slot {
          width: 150px;
        }

        .v-btn__content {
          justify-content: center;
        }
      }
    }

    @media screen and (max-width: 600px) {
      .spacer {
        display: none;
      }
    }
  }
}
</style>
