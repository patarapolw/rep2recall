import 'firebase/analytics'
import 'firebase/auth'

import { Plugin } from '@nuxt/types'
import { IUser } from '~/store'
import firebase from 'firebase/app'

const plugin: Plugin = async ({
  $axios,
  app: { $accessor },
  redirect,
  route,
}) => {
  const firebaseConfig = await $axios.$get('/api/firebase-config.json')

  firebase.initializeApp(firebaseConfig)
  firebase.analytics()

  let isFirebaseInit = false
  await new Promise<void>((resolve) => {
    firebase.auth().onAuthStateChanged(async (user) => {
      $axios.defaults.headers = $axios.defaults.headers || {}
      if (user) {
        $axios.defaults.headers.Authorization = `Bearer ${await user.getIdToken()}`
        const { data } = await $axios.get<IUser>('/api/user', {
          params: {
            select: 'name,email,image,apiKey',
          },
        })

        $accessor.UPDATE_USER(data)
      } else {
        delete $axios.defaults.headers.Authorization
        $accessor.UPDATE_USER(null)

        if (route.path !== '/') {
          redirect('/')
        }
      }

      if (!isFirebaseInit) {
        resolve()
        isFirebaseInit = true
      }
    })
  })
}

export default plugin
