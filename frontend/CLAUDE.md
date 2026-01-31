# Frontend Architecture Guide

This document describes the frontend conventions and patterns for AI agents and developers.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Data Fetching**: TanStack React Query
- **State Management**: React Query for server state, React hooks for local state

## Project Structure

```
frontend/
├── app/                  # Next.js App Router pages
│   ├── layout.tsx        # Root layout with Providers
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── hooks/                # React Query hooks
│   ├── index.ts          # Hook exports
│   └── useHealth.ts      # Example hook
├── lib/                  # Utilities and configuration
│   ├── api.ts            # API client
│   ├── providers.tsx     # React Query provider
│   └── query-client.ts   # Query client config
├── types/                # TypeScript types
│   └── api.ts            # API response types
└── public/               # Static assets
```

## Data Fetching Conventions

### Creating a New Hook

1. **Create the hook file** in `hooks/` with the naming pattern `use[Resource].ts`
2. **Define query keys** using a factory pattern for cache management
3. **Export from index.ts**

### Hook Template

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MyResource } from '@/types/api';

// Query key factory - enables precise cache invalidation
export const myResourceKeys = {
  all: ['myResource'] as const,
  lists: () => [...myResourceKeys.all, 'list'] as const,
  list: (filters: string) => [...myResourceKeys.lists(), filters] as const,
  details: () => [...myResourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...myResourceKeys.details(), id] as const,
};

// GET hook
export function useMyResource(id: string) {
  return useQuery({
    queryKey: myResourceKeys.detail(id),
    queryFn: () => api.get<MyResource>(`/my-resource/${id}`),
    enabled: !!id, // Only fetch if id exists
  });
}

// LIST hook
export function useMyResources(filters?: string) {
  return useQuery({
    queryKey: myResourceKeys.list(filters ?? ''),
    queryFn: () => api.get<MyResource[]>(`/my-resource?${filters}`),
  });
}

// CREATE hook
export function useCreateMyResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<MyResource>) =>
      api.post<MyResource>('/my-resource', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myResourceKeys.lists() });
    },
  });
}

// UPDATE hook
export function useUpdateMyResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MyResource> }) =>
      api.patch<MyResource>(`/my-resource/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: myResourceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: myResourceKeys.lists() });
    },
  });
}

// DELETE hook
export function useDeleteMyResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/my-resource/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myResourceKeys.lists() });
    },
  });
}
```

### Using Hooks in Components

```typescript
'use client';

import { useMyResource, useCreateMyResource } from '@/hooks';

export function MyComponent() {
  const { data, isLoading, error } = useMyResource('123');
  const createMutation = useCreateMyResource();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data?.name}</h1>
      <button
        onClick={() => createMutation.mutate({ name: 'New Item' })}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </button>
    </div>
  );
}
```

## API Client

The `lib/api.ts` provides a typed fetch wrapper:

```typescript
import { api } from '@/lib/api';

// GET request
const data = await api.get<MyType>('/endpoint');

// POST request
const result = await api.post<MyType>('/endpoint', { foo: 'bar' });

// PUT request
const updated = await api.put<MyType>('/endpoint/123', { foo: 'baz' });

// PATCH request
const patched = await api.patch<MyType>('/endpoint/123', { foo: 'qux' });

// DELETE request
await api.delete('/endpoint/123');
```

## Type Definitions

Add API response types in `types/api.ts`:

```typescript
export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
```

## Environment Variables

Frontend environment variables must be prefixed with `NEXT_PUBLIC_`:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Key Conventions

1. **Always use React Query for server state** - no useState for API data
2. **Query keys must be arrays** - enables partial matching for invalidation
3. **Use the query key factory pattern** - see examples above
4. **Mutations should invalidate related queries** - keep cache consistent
5. **Add 'use client' directive** for components using hooks
6. **Define types in types/api.ts** - keep types centralized
7. **Export hooks from hooks/index.ts** - enables clean imports
