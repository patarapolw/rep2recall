import {
  actionTree,
  mutationTree,
  useAccessor
} from 'typed-vuex'
import Vue from 'vue'
import Vuex from 'vuex'

export interface ITag {
  id: string;
  name: string;
  q: string;
  status: {
    new: boolean;
    due: boolean;
    leech: boolean;
    graduated: boolean;
  };
  itemSelected: string[];
  itemOpened: string[];
}

type ITagFull = ITag & {
  canDelete: boolean;
}

Vue.use(Vuex)

const state = (): {
  tags: ITagFull[];
} => ({
  tags: [{
    id: '',
    name: 'Default',
    q: '',
    status: {
      new: true,
      due: true,
      leech: true,
      graduated: false
    },
    canDelete: false,
    itemSelected: [''],
    itemOpened: ['']
  }]
})

const mutations = mutationTree(state, {
  UPDATE_TAGS (state, t: ITagFull) {
    const i = state.tags.map((t0) => t0.name).indexOf(t.name)

    if (i >= 0) {
      state.tags = [
        ...state.tags.slice(0, i),
        t,
        ...state.tags.slice(i + 1)
      ]
    } else {
      state.tags = [t, ...state.tags]
    }
  },
  REMOVE_TAGS (state, t: string) {
    if (!state.tags.map((t0) => t0.name).includes(t)) {
      return false
    }

    state.tags = state.tags.filter((t0) => t0.name !== t)

    return true
  }
})

const actions = actionTree({ state, mutations }, {
  hasTag ({ state }, t: string) {
    return state.tags.map((t0) => t0.name).includes(t)
  }
})

const storePattern = {
  state,
  mutations,
  actions,
  modules: {
  }
}

const store = new Vuex.Store(storePattern)

export const accessor = useAccessor(store, storePattern)
Vue.prototype.$accessor = accessor

declare module 'vue/types/vue' {
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  interface Vue {
    $accessor: typeof accessor;
  }
}

export default store
