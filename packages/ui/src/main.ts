import Vue from 'vue'
import dayjs from 'dayjs'

import App from './App.vue'
import router from './router'

import './plugins/buefy'
import './plugins/fontawesome'
import './plugins/mq'

Vue.config.productionTip = false

Vue.filter('nonZero', (v: any) => {
  return v === 0 ? '' : v
})

Vue.filter('format', (v: any) => {
  if (typeof v === 'number') {
    return (v || v === 0) ? v.toLocaleString() : ''
  } else if (v instanceof Date) {
    return dayjs(v).format('YYYY-MM-DD HH:mm')
  }
  return v
})

Vue.filter('formatDate', (v: any) => {
  return dayjs(v).format('YYYY-MM-DD HH:mm')
})

new Vue({
  router,
  render: (h) => h(App),
}).$mount('#app')