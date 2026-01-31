import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { HealthResponse } from '@/types/api';

export const healthKeys = {
  all: ['health'] as const,
  status: () => [...healthKeys.all, 'status'] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: healthKeys.status(),
    queryFn: () => api.get<HealthResponse>('/health'),
    refetchInterval: 30000, // Check every 30 seconds
  });
}
