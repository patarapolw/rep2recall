<template>
  <v-app>
    <v-progress-circular
      v-if="!user"
      :size="70"
      :width="7"
      indeterminate
    ></v-progress-circular>

    <v-app-bar v-if="user" app color="primary" dark hide-on-scroll>
      <v-app-bar-nav-icon @click.stop="isDrawer = !isDrawer" />
      <v-spacer />
      <form @submit.prevent="doSearch">
        <v-text-field
          v-model="q"
          label="Search"
          hide-details="auto"
          append-icon="mdi-magnify"
          @click:append="doSearch"
        />
      </form>
    </v-app-bar>

    <v-navigation-drawer
      v-if="user"
      v-model="isDrawer"
      absolute
      temporary
      style="height: 100vh"
      width="270"
    >
      <v-list>
        <v-list-group
          class="group-quiz"
          :value="isTagOpen"
          prepend-icon="mdi-frequently-asked-questions"
        >
          <template #activator>
            <v-list-item-title @click.stop="$router.push('/')">
              Quiz
            </v-list-item-title>
          </template>

          <v-list-item v-for="t in $store.state.tags" :key="t.id" link dense>
            <v-list-item-content @click="doLoad(t.id)">
              <v-list-item-title> {{ t.name }} </v-list-item-title>
            </v-list-item-content>

            <v-list-item-action v-if="t.canDelete">
              <v-btn icon @click="doDelete(t.id)">
                <v-icon>mdi-trash-can-outline</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list-group>

        <v-list-item to="/browse">
          <v-list-item-icon>
            <v-icon>mdi-format-list-bulleted</v-icon>
          </v-list-item-icon>

          <v-list-item-content>
            <v-list-item-title>Browse</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item to="/settings">
          <v-list-item-icon>
            <v-icon>mdi-cog</v-icon>
          </v-list-item-icon>

          <v-list-item-content>
            <v-list-item-title>Settings</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item
          href="https://www.github.com/patarapolw/rep2recall"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-list-item-icon>
            <v-icon>mdi-github</v-icon>
          </v-list-item-icon>

          <v-list-item-content>
            <v-list-item-title>About</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <template #append>
        <v-list-item two-line>
          <v-list-item-avatar>
            <img :src="user.image" />
          </v-list-item-avatar>

          <v-list-item-content>
            <v-list-item-title>
              {{ user.name }}
            </v-list-item-title>
            <v-list-item-subtitle>
              <v-btn x-small color="primary" @click="signOut"> Logout </v-btn>
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </template>
    </v-navigation-drawer>

    <v-main v-if="user">
      <nuxt />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { ITag } from '~/store'
import firebase from 'firebase/app'
import { Component, Vue } from 'nuxt-property-decorator'

// eslint-disable-next-line no-use-before-define
@Component<LoggedInLayout>({
  watch: {
    user() {
      this.loadPreset()
    },
  },
  created() {
    this.q = this.$accessor.q
    this.loadPreset()
  },
})
export default class LoggedInLayout extends Vue {
  isDrawer = false
  isTagOpen = true
  isEdited = false
  q = ''

  get user() {
    return this.$accessor.user
  }

  doSearch() {
    this.$accessor.UPDATE_Q(this.q)
  }

  doLoad(id: string) {
    this.$router.push({
      path: '/quiz',
      query: {
        id,
      },
    })
  }

  doDelete(id: string) {
    this.$accessor.REMOVE_TAGS(id)
  }

  async loadPreset() {
    try {
      await this.$axios.$get('/api/preset', {
        params: {
          select: 'id',
        },
      })
    } catch (e) {
      await this.$axios.$put('/api/preset', {
        id: '',
        q: this.q,
        name: 'Default',
        selected: [''],
        opened: [''],
        status: {
          new: true,
          due: true,
          leech: true,
          graduated: false,
        },
      })
    }

    const { data } = await this.$axios.get<{
      result: ITag[]
    }>('/api/preset/all')

    data.result.map((t) => {
      return this.$accessor.UPDATE_TAGS({
        ...t,
        canDelete: !!t.id,
      })
    })
  }

  signOut() {
    firebase.auth().signOut()
  }
}
</script>

<style lang="scss" scoped>
.v-text-field {
  width: 400px;

  @media screen and (max-width: 500px) {
    width: calc(100vw - 60px);
  }
}

.v-list-item,
.v-list-group:not(.v-list-group--active) {
  &:hover {
    background-color: rgba(173, 216, 230, 0.2);
  }
}

.group-quiz ::v-deep .v-list-group__items {
  background-color: rgba(177, 197, 195, 0.2);

  .v-list-item {
    padding-left: 3em;
  }

  .v-btn {
    filter: opacity(0.5);

    &:hover {
      filter: unset;
    }
  }
}
</style>

<style lang="scss">
html,
body {
  &::-webkit-scrollbar {
    display: none;
  }
}

.v-dialog__content {
  max-width: 100vw;
  max-height: 100vh;
}

.v-overflow-btn.v-input--is-disabled .v-btn {
  color: rgba(0, 0, 0, 0.38);
}
</style>
