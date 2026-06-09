import { mockClient, mockTransactions, mockDecisions, mockDocuments } from './mockData';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const clientService = {
  getClient:       async (id) => { await delay(300); return mockClient; },
  getTransactions: async (id) => { await delay(300); return mockTransactions; },
  getDecisions:    async (id) => { await delay(300); return mockDecisions; },
  getDocuments:    async ()   => { await delay(300); return mockDocuments; },
};