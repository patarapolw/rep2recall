import { Plugin } from '@nuxt/types'

const plugin: Plugin = ({ $axios, error }) => {
  if (typeof location !== 'undefined') {
    $axios.defaults.baseURL = location.origin
  }

  $axios.interceptors.response.use(
    (r) => {
      if (r.data?.error) {
        error({
          statusCode: r.status,
          message: r.data.error,
        })
        throw new Error(r.data.error)
      }

      return r
    },
    (err) => {
      error({
        statusCode: err.response.status,
        message: err.toJSON(),
      })

      return Promise.reject(err)
    }
  )
}

export default plugin
