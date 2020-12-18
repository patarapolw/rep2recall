import { NuxtConfig } from '@nuxt/types'
import mongoose from 'mongoose'
import colors from 'vuetify/es5/util/colors'

const config = async (): Promise<NuxtConfig> => {
  if (!process.env.IS_LOCAL) {
    await mongoose.connect(process.env.MONGO_URI!, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    })
  }

  return {
    // Disable server-side rendering (https://go.nuxtjs.dev/ssr-mode)
    ssr: false,

    // Global page headers (https://go.nuxtjs.dev/config-head)
    head: {
      titleTemplate: '%s - Rep2Recall',
      title: 'Rep2Recall',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          hid: 'description',
          name: 'description',
          content: 'Repeat until recall, with widening intervals.',
        },
      ],
      link: [
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/apple-touch-icon.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/favicon-32x32.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '16x16',
          href: '/favicon-16x16.png',
        },
        {
          rel: 'manifest',
          href: '/site.webmanifest',
        },
      ],
      script: [
        {
          async: true,
          defer: true,
          'data-domain': 'rep2recall.net',
          src: 'https://plausible.io/js/plausible.js',
        },
      ],
    },

    // Global CSS (https://go.nuxtjs.dev/config-css)
    css: [],

    // Plugins to run before rendering page (https://go.nuxtjs.dev/config-plugins)
    plugins: ['~/plugins/axios-fix.ts', '~/plugins/firebase.client.ts'],

    // Auto import components (https://go.nuxtjs.dev/config-components)
    components: true,

    // Modules for dev and build (recommended) (https://go.nuxtjs.dev/config-modules)
    buildModules: [
      // https://go.nuxtjs.dev/typescript
      '@nuxt/typescript-build',
      // https://go.nuxtjs.dev/vuetify
      '@nuxtjs/vuetify',
      'nuxt-typed-vuex',
    ],

    // Modules (https://go.nuxtjs.dev/config-modules)
    modules: [
      // https://go.nuxtjs.dev/axios
      '@nuxtjs/axios',
      // https://go.nuxtjs.dev/pwa
      '@nuxtjs/pwa',
    ],

    // Axios module configuration (https://go.nuxtjs.dev/config-axios)
    axios: {},

    // Vuetify module configuration (https://go.nuxtjs.dev/config-vuetify)
    vuetify: {
      customVariables: ['~/assets/variables.scss'],
      theme: {
        // dark: true,
        themes: {
          dark: {
            primary: colors.blue.darken2,
            accent: colors.grey.darken3,
            secondary: colors.amber.darken3,
            info: colors.teal.lighten1,
            warning: colors.amber.base,
            error: colors.deepOrange.accent4,
            success: colors.green.accent3,
          },
        },
      },
    },

    // Build Configuration (https://go.nuxtjs.dev/config-build)
    build: {},

    serverMiddleware: [
      {
        path: '/api',
        handler: '~/server/middleware.ts',
      },
    ],

    env: {
      IS_LOCAL: process.env.IS_LOCAL || '',
    },
  }
}

export default config
