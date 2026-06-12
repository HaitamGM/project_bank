import apiClient from './apiClient'

// Déclenche les pipelines de vérification côté backend et la signature OTP des virements.
export const pipelineService = {
  async runCredit(params) {
    // params: { montant, dureeMois, objet, autresCharges? }
    const { data } = await apiClient.post('/pipeline/credit', params)
    return data
  },

  async runTransfer(params) {
    // params: { montant, beneficiaire, compteSource? }
    const { data } = await apiClient.post('/pipeline/transfer', params)
    return data
  },

  async confirmTransfer(challengeId, otp) {
    const { data } = await apiClient.post('/pipeline/transfer/confirm', { challengeId, otp })
    return data
  },

  async getAudit() {
    const { data } = await apiClient.get('/audit/me')
    return data
  },
}
