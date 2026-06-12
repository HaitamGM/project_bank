import apiClient from './apiClient'

// Extrait un message d'erreur lisible d'une erreur axios.
export function errorMessage(err, fallback = 'Une erreur est survenue.') {
  return err?.response?.data?.detail || err?.message || fallback
}

export const authService = {
  // Étape 1 : email + mot de passe → renvoie un challenge OTP.
  async login(email, password) {
    const { data } = await apiClient.post('/auth/login', { email, password })
    return data // { challengeId, expiresIn, devOtp?, message }
  },

  // Étape 2 : OTP → renvoie le jeton + le client, et les stocke.
  async verifyOtp(challengeId, otp) {
    const { data } = await apiClient.post('/auth/verify-otp', { challengeId, otp })
    localStorage.setItem('token', data.token)
    localStorage.setItem('clientId', data.client.id)
    localStorage.setItem('client', JSON.stringify(data.client))
    return data
  },

  // Ré-authentification (step-up) : revérifie le mot de passe pour déverrouiller les soldes.
  async verifyPassword(password) {
    const { data } = await apiClient.post('/auth/verify-password', { password })
    return data // { ok: true }
  },

  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('clientId')
    localStorage.removeItem('client')
    sessionStorage.removeItem('balanceUnlocked')
  },

  getToken() {
    return localStorage.getItem('token')
  },

  isAuthenticated() {
    return !!localStorage.getItem('token')
  },

  getStoredClient() {
    try {
      return JSON.parse(localStorage.getItem('client'))
    } catch {
      return null
    }
  },
}
