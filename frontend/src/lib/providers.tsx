'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client';

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
