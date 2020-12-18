// import * as submodule from '~/store/submodule'
import { mutationTree } from 'nuxt-typed-vuex'
import { actionTree, getAccessorType } from 'typed-vuex'

export interface IStatus {
  new: boolean
  due: boolean
  leech: boolean
  graduated: boolean
}

export interface ITag {
  id: string
  name: string
  q: string
  status: IStatus
  selected: string[]
  opened: string[]
}

type ITagFull = ITag & {
  canDelete: boolean
}

export interface IUser {
  name: string
  email: string
  image: string
  apiKey: string
}

export const state = (): {
  q: string
  tags: ITagFull[]
  user: IUser | null
  isFirebaseReady: boolean
} => ({
  q: '',
  tags: [],
  user: null,
  isFirebaseReady: false,
})

export const mutations = mutationTree(state, {
  UPDATE_Q(state, q: string) {
    state.q = q
  },
  UPDATE_USER(state, user: IUser | null) {
    state.user = user
    state.isFirebaseReady = true
  },
  UPDATE_TAGS(state, t: ITagFull) {
    const i = state.tags.map((t0) => t0.name).indexOf(t.name)

    if (i >= 0) {
      state.tags = [...state.tags.slice(0, i), t, ...state.tags.slice(i + 1)]
    } else {
      state.tags = [t, ...state.tags]
    }
  },
  REMOVE_TAGS(state, t: string) {
    if (!state.tags.map((t0) => t0.name).includes(t)) {
      return false
    }

    state.tags = state.tags.filter((t0) => t0.name !== t)

    return true
  },
})

const actions = actionTree(
  { state, mutations },
  {
    hasTag({ state }, t: string) {
      return state.tags.map((t0) => t0.name).includes(t)
    },
  }
)

export const accessorType = getAccessorType({
  state,
  mutations,
  // getters,
  actions,
  modules: {
    // The key (submodule) needs to match the Nuxt namespace (e.g. ~/store/submodule.ts)
    // submodule,
  },
})
