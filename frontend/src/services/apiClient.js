import axios from 'axios'

// Instance axios partagée. baseURL '/api' passe par le proxy Vite vers le backend (port 8000).
const apiClient = axios.create({ baseURL: '/api' })

// Joint automatiquement le jeton JWT à chaque requête.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// En cas de 401 (jeton expiré/invalide) : on purge la session et on renvoie au login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('clientId')
      localStorage.removeItem('client')
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
