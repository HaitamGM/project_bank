import apiClient from './apiClient'

// Données réelles du client connecté (dérivées du jeton JWT côté backend).
// Le paramètre clientId est ignoré : le backend renvoie toujours le client du jeton (sécurité).
export const clientService = {
  getClient: async () => {
    const { data } = await apiClient.get('/clients/me')
    return data
  },
  getTransactions: async () => {
    const { data } = await apiClient.get('/clients/me/transactions')
    return data
  },
  getDecisions: async () => {
    const { data } = await apiClient.get('/clients/me/decisions')
    return data
  },
  getExplainability: async () => {
    const { data } = await apiClient.get('/clients/me/explainability')
    return data
  },
  getPipelineRuns: async () => {
    const { data } = await apiClient.get('/clients/me/pipeline-runs')
    return data
  },
  getAnalytics: async () => {
    const { data } = await apiClient.get('/clients/me/analytics')
    return data
  },
  getAgents: async () => {
    const { data } = await apiClient.get('/agents')
    return data
  },
  getDocuments: async () => {
    const { data } = await apiClient.get('/documents')
    return data
  },
  getConversations: async () => {
    const { data } = await apiClient.get('/clients/me/conversations')
    return data
  },
  saveConversation: async (payload) => {
    // payload: { channel: 'vocal'|'texte', messages: [{ role, text }] }
    const { data } = await apiClient.post('/clients/me/conversations', payload)
    return data
  },
  addBeneficiary: async (benef) => {
    // benef: { nom, banque?, rib? } — persiste un bénéficiaire dans clients.json
    const { data } = await apiClient.post('/clients/me/beneficiaries', benef)
    return data
  },
}
