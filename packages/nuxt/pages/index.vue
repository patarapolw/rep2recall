<template>
  <v-app>
    <v-container>
      <v-card>
        <v-card-text>
          <h2 class="mb-4">Login to Rep2recall</h2>
          <div id="firebaseui"></div>

          <h2 class="mb-4">Features</h2>
          <center>
            <img
              src="https://thumbs.gfycat.com/ChillyHospitableBison-size_restricted.gif"
              alt="screenshot"
              style="max-width: 100%"
            />
          </center>
          <ul>
            <li>
              Full range of JavaScript/CSS/HTML as supported by latest web
              browsers
            </li>
            <li>
              Internally and externally linked
              <a
                href="https://ejs.co/"
                target="_blank"
                rel="noopener noreferrer"
              >
                EJS templates
              </a>
            </li>
            <li>
              Online first, with
              <a href="/api/doc" target="_blank" rel="noopener noreferrer">
                exposed OpenAPI
              </a>
            </li>
          </ul>
        </v-card-text>
      </v-card>
    </v-container>
  </v-app>
</template>

<script lang="ts">
import 'firebase/auth'
import 'firebaseui/dist/firebaseui.css'

import firebase from 'firebase/app'
import { auth as firebaseui } from 'firebaseui'
import { Component, Vue } from 'nuxt-property-decorator'

// eslint-disable-next-line no-use-before-define
@Component<FrontPage>({
  middleware(ctx) {
    if (process.env.IS_LOCAL) {
      ctx.redirect('/quiz')
    }
  },
  mounted() {
    this.ui.start(this.$el.querySelector('#firebaseui') as HTMLElement, {
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.GithubAuthProvider.PROVIDER_ID,
        // firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        {
          provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
          requireDisplayName: true,
          signInMethod:
            firebase.auth.EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD,
        },
      ],
      signInFlow: 'popup',
      callbacks: {
        signInSuccessWithAuthResult: () => {
          return false
        },
      },
    })
  },
  beforeDestroy() {
    this.ui.delete()
  },
})
export default class FrontPage extends Vue {
  ui = new firebaseui.AuthUI(firebase.auth())
}
</script>

<style lang="scss" scoped>
.v-card {
  margin: 0 auto;
  max-width: 600px;
}
</style>
