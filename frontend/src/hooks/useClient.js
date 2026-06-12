import { useQuery } from '@tanstack/react-query';
import { clientService } from '../services/clientService';

export function useClient(clientId) {
  return useQuery({ queryKey: ['client', clientId], queryFn: () => clientService.getClient(clientId) });
}
export function useTransactions(clientId) {
  return useQuery({ queryKey: ['transactions', clientId], queryFn: () => clientService.getTransactions(clientId) });
}
export function useDecisions(clientId) {
  return useQuery({ queryKey: ['decisions', clientId], queryFn: () => clientService.getDecisions(clientId) });
}
export function useDocuments() {
  return useQuery({ queryKey: ['documents'], queryFn: () => clientService.getDocuments() });
}
export function useExplainability(clientId) {
  return useQuery({ queryKey: ['explainability', clientId], queryFn: () => clientService.getExplainability() });
}
export function usePipelineRuns(clientId) {
  return useQuery({ queryKey: ['pipeline-runs', clientId], queryFn: () => clientService.getPipelineRuns() });
}
export function useAnalytics(clientId) {
  return useQuery({ queryKey: ['analytics', clientId], queryFn: () => clientService.getAnalytics() });
}
export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: () => clientService.getAgents() });
}
export function useConversations(clientId) {
  return useQuery({ queryKey: ['conversations', clientId], queryFn: () => clientService.getConversations() });
}