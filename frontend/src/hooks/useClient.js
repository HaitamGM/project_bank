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