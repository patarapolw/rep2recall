process.env.VUE_APP_FIREBASE_CONFIG = process.env.FIREBASE_CONFIG

module.exports = {
  lintOnSave: false,
  transpileDependencies: ['vuetify'],
  outputDir: '../next-server/public',
  devServer: {
    proxy: {
      '^/(api|media)/': {
        target: 'http://localhost:36393'
      }
    }
  }
}
